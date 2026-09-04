// On-device NEXUS server: runs the full app bundle (SSR + server functions)
// under Node by adapting the Worker-style fetch handler to node:http.
// Layout expected on disk:
//   /opt/nexus/app/client/**   static assets
//   /opt/nexus/app/server/index.mjs   fetch handler
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import {
  createReadStream,
  existsSync,
  statSync,
  readFileSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';
import { tmpdir, hostname, release, userInfo } from 'node:os';
import { handleNexusApi } from './nexus-api.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = process.env.NEXUS_APP || join(HERE, 'app');
const CLIENT = join(APP, 'client');
const SERVER_ENTRY = join(APP, 'server', 'index.mjs');
const PORT = Number(process.env.NEXUS_PORT || 8080);
const HOST = process.env.NEXUS_HOST || '127.0.0.1';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function resolveStatic(pathname) {
  const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const target = join(CLIENT, safe);
  if (!target.startsWith(CLIENT)) return null;
  if (existsSync(target) && statSync(target).isFile()) return target;
  return null;
}

// Worker "ASSETS" binding backed by the client directory.
const ASSETS = {
  async fetch(request) {
    const file = resolveStatic(new URL(request.url).pathname);
    if (!file) return new Response('Not found', { status: 404 });
    return new Response(readFileSync(file), {
      headers: {
        'content-type': TYPES[extname(file)] || 'application/octet-stream',
        'cache-control': file.includes(`${'/'}assets${'/'}`)
          ? 'public,max-age=31536000,immutable'
          : 'no-cache',
      },
    });
  },
};

let handlerPromise;
function getHandler() {
  if (!handlerPromise) {
    handlerPromise = import(pathToFileURL(SERVER_ENTRY).href).then((m) => m.default || m);
  }
  return handlerPromise;
}

function toRequest(req) {
  const url = `http://${req.headers.host || `${HOST}:${PORT}`}${req.url}`;
  const method = req.method || 'GET';
  const body = method === 'GET' || method === 'HEAD' ? undefined : Readable.toWeb(req);
  return new Request(url, {
    method,
    headers: req.headers,
    body,
    duplex: 'half',
  });
}

async function send(res, response) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) return res.end();
  for await (const chunk of response.body) res.write(chunk);
  res.end();
}

// --- real shell bridge -----------------------------------------------------
// The NEXUS Terminal posts command lines here; they run in a real login bash
// as the unprivileged session user. Loopback callers only, and disableable
// with NEXUS_EXEC=off.
const EXEC_ENABLED = (process.env.NEXUS_EXEC || 'on') !== 'off';
const EXEC_SHELL = process.env.NEXUS_SHELL || '/bin/bash';
const EXEC_TIMEOUT = Number(process.env.NEXUS_EXEC_TIMEOUT || 60_000);
const EXEC_MAXBYTES = Number(process.env.NEXUS_EXEC_MAXBYTES || 512 * 1024);

function isLoopback(req) {
  return /^(::1|::ffff:127\.|127\.)/.test(req.socket.remoteAddress || '');
}

function readBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) reject(new Error('body too large'));
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function runShell(cmd, cwd) {
  return new Promise((resolve) => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-shell-'));
    const cwdFile = join(dir, 'cwd');
    const script = [
      `cd ${shQuote(cwd || userInfo().homedir)} 2>/dev/null || cd "$HOME"`,
      cmd,
      '__nexus_rc=$?',
      `printf '%s' "$PWD" > ${shQuote(cwdFile)}`,
      'exit $__nexus_rc',
    ].join('\n');

    const child = spawn(EXEC_SHELL, ['-l', '-c', script], {
      cwd: userInfo().homedir,
      env: { ...process.env, TERM: 'xterm-256color', NEXUS_SESSION: '1' },
    });

    let stdout = '';
    let stderr = '';
    let truncated = false;
    let timedOut = false;
    const collect = (chunk, which) => {
      const text = chunk.toString();
      if (which === 'out') {
        if (stdout.length + text.length > EXEC_MAXBYTES) truncated = true;
        else stdout += text;
      } else if (stderr.length + text.length > EXEC_MAXBYTES) truncated = true;
      else stderr += text;
    };
    child.stdout.on('data', (c) => collect(c, 'out'));
    child.stderr.on('data', (c) => collect(c, 'err'));

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, EXEC_TIMEOUT);

    child.on('close', (code) => {
      clearTimeout(timer);
      let nextCwd = cwd;
      try {
        nextCwd = readFileSync(cwdFile, 'utf8') || cwd;
      } catch {
        /* command may have exited before writing */
      }
      rmSync(dir, { recursive: true, force: true });
      resolve({ stdout, stderr, code: code ?? -1, cwd: nextCwd, truncated, timedOut });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      rmSync(dir, { recursive: true, force: true });
      resolve({ stdout: '', stderr: String(err), code: 127, cwd, truncated, timedOut });
    });
  });
}

function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    // Real device API (filesystem, processes, hardware, apps, packages, auth).
    if (url.pathname.startsWith('/nexus/') && url.pathname !== '/nexus/exec' && url.pathname !== '/nexus/install') {
      if (await handleNexusApi(req, res, url)) return;
    }

    // Real Linux shell bridge (loopback only).
    if (url.pathname === '/nexus/exec') {
      if (!isLoopback(req)) return json(res, 403, { available: false, reason: 'loopback only' });
      if (!EXEC_ENABLED || !existsSync(EXEC_SHELL))
        return json(res, 200, { available: false, reason: 'shell bridge disabled' });

      if (req.method === 'GET') {
        const who = userInfo();
        let os = 'Linux';
        try {
          const m = readFileSync('/etc/os-release', 'utf8').match(/^PRETTY_NAME="?(.*?)"?$/m);
          if (m) os = m[1];
        } catch {
          /* keep default */
        }
        return json(res, 200, {
          available: true,
          shell: EXEC_SHELL,
          user: who.username,
          host: hostname(),
          home: who.homedir,
          os,
          kernel: release(),
        });
      }

      if (req.method === 'POST') {
        const body = JSON.parse((await readBody(req)) || '{}');
        if (typeof body.cmd !== 'string' || !body.cmd.trim())
          return json(res, 400, { error: 'cmd required' });
        const result = await runShell(body.cmd, typeof body.cwd === 'string' ? body.cwd : '');
        return json(res, 200, result);
      }

      return json(res, 405, { error: 'method not allowed' });
    }

    // Device-local control endpoints (loopback callers only).
    if (url.pathname === '/nexus/install' && req.method === 'POST') {
      if (!isLoopback(req)) {
        res.writeHead(403, { 'content-type': 'text/plain' });
        return res.end('loopback only');
      }
      const child = spawn('/opt/nexus/install.sh', [], {
        detached: true,
        stdio: 'ignore',
      });
      child.unref();
      res.writeHead(202, { 'content-type': 'application/json' });
      return res.end(JSON.stringify({ started: true }));
    }

    const file = resolveStatic(url.pathname);
    if (file) {
      res.writeHead(200, {
        'content-type': TYPES[extname(file)] || 'application/octet-stream',
        'cache-control': file.includes('/assets/')
          ? 'public,max-age=31536000,immutable'
          : 'no-cache',
      });
      return createReadStream(file).pipe(res);
    }

    if (!existsSync(SERVER_ENTRY)) {
      res.writeHead(500, { 'content-type': 'text/plain' });
      return res.end('NEXUS bundle missing: ' + SERVER_ENTRY);
    }

    const handler = await getHandler();
    const response = await handler.fetch(toRequest(req), { ASSETS, ...process.env }, {
      waitUntil() {},
      passThroughOnException() {},
    });
    await send(res, response);
  } catch (err) {
    console.error('[nexus] request failed:', err);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('NEXUS internal error');
  }
}).listen(PORT, HOST, () => {
  console.log(`NEXUS server listening on http://${HOST}:${PORT} (app: ${APP})`);
});
