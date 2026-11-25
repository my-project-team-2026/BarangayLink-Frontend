import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Strict CSP is applied to production builds only. The Vite dev server injects an
// inline React Fast Refresh script that `script-src 'self'` blocks, which left the
// Electron window blank in `npm run dev`.
const PROD_CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http: https: ws: wss:; font-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'"
const cspForBuild = (): Plugin => ({
  name: 'csp-for-build',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: PROD_CSP }, injectTo: 'head-prepend' }
  ]
})

export default defineConfig({
  base: './',
  plugins: [react(), cspForBuild()],
  server: { host: '127.0.0.1', port: 5174, strictPort: true }
})
