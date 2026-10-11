import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // В Docker на Windows/macOS события файловой системы из примонтированной папки не доходят — опрашиваем файлы
    watch: process.env.VITE_POLL ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      // В Docker бэкенд доступен как backend:8000, локально — 127.0.0.1:8000 (localhost в Node может уйти в IPv6)
      '/api': process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8000',
    },
  },
})
