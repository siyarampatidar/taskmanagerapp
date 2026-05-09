import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'https://taskmanagerapp-backend-kv8n.onrender.com',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://taskmanagerapp-backend-kv8n.onrender.com',
        ws: true,
        changeOrigin: true,
      },
    }
  }
})
