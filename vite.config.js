import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

function uploadAvatarPlugin() {
  return {
    name: 'upload-avatar',
    configureServer(server) {
      server.middlewares.use('/api/upload-avatar', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const { playerId, images } = JSON.parse(body);

            if (!playerId || !/^[a-zA-Z0-9_\-]+$/.test(playerId)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid playerId' }));
              return;
            }

            const dir = resolve(__dirname, 'public/media/avatars', playerId);
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

            const urls = {};
            for (const [size, dataUrl] of Object.entries(images)) {
              const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
              const buffer = Buffer.from(base64, 'base64');
              writeFileSync(resolve(dir, `${size}.webp`), buffer);
              urls[size] = `/media/avatars/${playerId}/${size}.webp`;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ urls }));
          } catch (err) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}

export default defineConfig({
    plugins: [react(), uploadAvatarPlugin()],
    resolve: {
        alias: {
            '@': resolve(__dirname, 'app/src'),
        },
    },
    server: {
        port: 5173,
        strictPort: false,
    },
});
