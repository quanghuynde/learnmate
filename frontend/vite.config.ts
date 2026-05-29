import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {},
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/shineshop': {
        target: 'https://api.shineshop.dev',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/shineshop/, ''),
      },
    },
  },
})
