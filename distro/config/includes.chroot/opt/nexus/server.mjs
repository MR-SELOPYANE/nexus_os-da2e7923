// Minimal on-device static server for the NEXUS shell (SPA fallback).
// Runs as a systemd service on 127.0.0.1:8080.
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = '/opt/nexus/app';
const PORT = Number(process.env.NEXUS_PORT || 8080);

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
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function send(res, file, status = 200) {
  res.writeHead(status, {
    'content-type': TYPES[extname(file)] || 'application/octet-stream',
    'cache-control': file.includes('/assets/') ? 'public,max-age=31536000,immutable' : 'no-cache',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const safe = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const target = join(ROOT, safe);

  if (target.startsWith(ROOT) && existsSync(target) && statSync(target).isFile()) {
    return send(res, target);
  }
  const index = join(ROOT, 'index.html');
  if (existsSync(index)) return send(res, index);
  res.writeHead(404).end('NEXUS bundle missing');
}).listen(PORT, '127.0.0.1', () => {
  console.log(`NEXUS server listening on 127.0.0.1:${PORT}`);
});
