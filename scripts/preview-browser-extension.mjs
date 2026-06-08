import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve('dist/viewer');
const port = Number(process.env.AGENTMEMORY_EXTENSION_PREVIEW_PORT || process.env.PORT || 3113);

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8']
]);

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
}

function fileForPath(pathname) {
  const clean = decodeURIComponent(pathname.split('?')[0] || '/');
  const relative = clean === '/' ? 'demo/browser-extension.html' : clean.replace(/^\/+/, '');
  const full = normalize(join(root, relative));
  if (!full.startsWith(root)) return null;
  return full;
}

if (!existsSync(join(root, 'demo', 'browser-extension.html'))) {
  console.error('Missing dist/viewer/demo/browser-extension.html. Run `npm run build` first.');
  process.exit(1);
}

const server = createServer((req, res) => {
  const method = req.method || 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    send(res, 405, 'method not allowed');
    return;
  }
  const file = fileForPath(req.url || '/');
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    send(res, 404, 'not found');
    return;
  }
  const body = readFileSync(file);
  res.writeHead(200, {
    'Content-Type': types.get(extname(file)) || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  res.end(method === 'HEAD' ? undefined : body);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Agent Memory Lab extension preview: http://localhost:${port}/demo/browser-extension.html`);
});
