import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves from https://<user>.github.io/<repo>/, so assets must be
// requested from that subpath. Set via env in CI; defaults to '/' for local dev
// and for any host that serves from the domain root (Render, Netlify, Vercel).
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  build: { target: 'es2022' },
  optimizeDeps: { include: ['pdfjs-dist'] },
})
