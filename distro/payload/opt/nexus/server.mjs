// On-device NEXUS server: runs the full app bundle (SSR + server functions)
// under Node by adapting the Worker-style fetch handler to node:http.
// Layout expected on disk:
//   /opt/nexus/app/client/**   static assets
//   /opt/nexus/app/server/index.mjs   fetch handler
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Readable } from 'node:stream';

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

createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${HOST}:${PORT}`);

    // Device-local control endpoints (loopback callers only).
    if (url.pathname === '/nexus/install' && req.method === 'POST') {
      const remote = req.socket.remoteAddress || '';
      if (!/^(::1|::ffff:127\.|127\.)/.test(remote)) {
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
