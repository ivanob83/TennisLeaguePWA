import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import react from '@vitejs/plugin-react'

const __dirname = dirname(fileURLToPath(import.meta.url))

function uploadAvatarPlugin() {
  return {
    name: 'upload-avatar',
    configureServer(server) {
      function handler(req, res) {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const { playerId, images } = JSON.parse(body)
            if (!playerId || !/^[a-zA-Z0-9_\-]+$/.test(playerId)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid playerId' }))
              return
            }
            const dir = resolve(__dirname, 'public/media/avatars', playerId)
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
            const urls = {}
            for (const [size, dataUrl] of Object.entries(images)) {
              const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
              const buffer = Buffer.from(base64, 'base64')
              writeFileSync(resolve(dir, `${size}.webp`), buffer)
              urls[size] = `/media/avatars/${playerId}/${size}.webp`
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ urls }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      }
      server.middlewares.use('/api/upload-avatar', handler)
      server.middlewares.use('/api/upload-avatar.php', handler)
    },
  }
}

function uploadCompetitionImagePlugin() {
  return {
    name: 'upload-competition-image',
    configureServer(server) {
      function handler(req, res) {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }
        let body = ''
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', () => {
          try {
            const { competitionId, images } = JSON.parse(body)
            if (!competitionId || !/^[a-zA-Z0-9_\-]+$/.test(competitionId)) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'Invalid competitionId' }))
              return
            }
            const dir = resolve(__dirname, 'public/media/competitions', competitionId)
            if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
            const urls = {}
            for (const [size, dataUrl] of Object.entries(images)) {
              const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
              const buffer = Buffer.from(base64, 'base64')
              writeFileSync(resolve(dir, `${size}.webp`), buffer)
              urls[size] = `/media/competitions/${competitionId}/${size}.webp`
            }
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ urls }))
          } catch (err) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: err.message }))
          }
        })
      }
      server.middlewares.use('/api/upload-competition-image', handler)
      server.middlewares.use('/api/upload-competition-image.php', handler)
    },
  }
}

export default defineConfig({
  plugins: [react(), uploadAvatarPlugin(), uploadCompetitionImagePlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'app/src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    hmr: {
      host: 'localhost',
      port: 5173,
    },
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase'))
            return 'vendor-firebase'
          if (id.includes('node_modules/react-dom')) return 'vendor-react-dom'
          if (id.includes('node_modules/react-router')) return 'vendor-router'
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide'
          if (id.includes('node_modules/react-easy-crop')) return 'vendor-crop'
          if (id.includes('node_modules')) return 'vendor'
        },
      },
    },
  },
})
