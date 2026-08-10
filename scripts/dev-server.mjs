import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { createServer } from 'node:http';

const rootOption = process.argv.find(argument => argument.startsWith('--root='));
const root = resolve(process.cwd(), rootOption ? rootOption.slice('--root='.length) : '.');
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
  const requestPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const mapped = requestPath === 'vendor/three.module.js' && !existsSync(join(root, requestPath))
    ? 'node_modules/three/build/three.module.js'
    : requestPath;
  const file = normalize(join(root, mapped));
  const pathFromRoot = relative(root, file);
  if (pathFromRoot.startsWith('..') || pathFromRoot === '' || !existsSync(file)) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-store');
  createReadStream(file).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`FIRST BLAST: http://127.0.0.1:${port}/`);
});
