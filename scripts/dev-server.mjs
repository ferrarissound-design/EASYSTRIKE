import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { createServer } from 'node:http';

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const mapped = relative === 'vendor/three.module.js'
    ? 'node_modules/three/build/three.module.js'
    : relative;
  const file = normalize(join(root, mapped));
  if (!file.startsWith(root) || !existsSync(file)) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`FIRST BLAST: http://127.0.0.1:${port}/`);
});
