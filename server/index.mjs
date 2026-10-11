import http from 'node:http';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { resolveByteRange } from './ranges.js';

const publicRoot = fileURLToPath(new URL('../public/', import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.mp4': 'video/mp4', '.png': 'image/png' };
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
    const decoded = decodeURIComponent(url.pathname);
    const root = publicRoot;
    const filename = decoded === '/' ? 'index.html' : decoded.slice(1);
    const target = path.resolve(root, filename);
    const relative = path.relative(root, target);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(part => part.startsWith('.'))) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const info = await stat(target);
    if (!info.isFile()) { response.writeHead(404); response.end('Not found'); return; }
    const range = resolveByteRange(request.headers.range, info.size);
    if (range === false) {
      response.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
      response.end();
      return;
    }
    response.writeHead(range ? 206 : 200, {
      'Content-Type': mime[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Accept-Ranges': 'bytes',
      'Content-Length': range ? range.end - range.start + 1 : info.size,
      ...(range ? { 'Content-Range': `bytes ${range.start}-${range.end}/${info.size}` } : {}),
    });
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = createReadStream(target, range || {});
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch (error) {
    response.writeHead(error.code === 'ENOENT' || error.code === 'EISDIR' ? 404 : 400);
    response.end(error.code === 'ENOENT' || error.code === 'EISDIR' ? 'Not found' : 'Invalid request');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is in use. Start with PORT=3001 npm run dev.` : error.message);
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => console.log(`wave to earth — http://localhost:${port}`));
