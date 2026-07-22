import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

// DEV-ONLY: lets the running page POST a canvas dataURL to be written
// to disk, so frames can be inspected when the preview screenshot tool
// is unavailable. Not part of the shipped build.
const capturePlugin = {
  name: 'frame-capture',
  configureServer(server) {
    server.middlewares.use('/__save', (req, res) => {
      if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        try {
          const b64 = body.split(',')[1] || body;
          writeFileSync(new URL('./__frame.png', import.meta.url), Buffer.from(b64, 'base64'));
          res.statusCode = 200; res.end('ok');
        } catch (e) { res.statusCode = 500; res.end(String(e)); }
      });
    });
  },
};

// The dev server is launched through a space-free junction
// (isometric-portfolio-link) that points at this real folder. Pin the
// root to this config file's own directory and preserve symlinks so
// Vite's module graph stays consistent through the junction (otherwise
// it serves source untransformed and bare imports like "three" break).
const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  root,
  plugins: [capturePlugin],
  resolve: { preserveSymlinks: true },
  server: {
    host: true,
    port: 5173,
    fs: { allow: [root] },
  },
});
