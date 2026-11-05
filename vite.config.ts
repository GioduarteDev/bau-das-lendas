
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { entries: ['index.html'] },

  server: {
    port: 5175,
    host: true,
    allowedHosts: true, // permite abrir o servidor local por um túnel HTTPS público
    strictPort: true,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx,cer,der}', '.npmrc', '.yarnrc.yml', '**/.git/**', '**/backend/**', '**/.demo-account.local.json'] },
    proxy: { '^/api/': { target: 'http://127.0.0.1:8000', changeOrigin: false } },
  },
  preview: { proxy: { '^/api/': { target: 'http://127.0.0.1:8000', changeOrigin: false } } },
})
