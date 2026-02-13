import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      external: ['mongodb', 'pg'],
    },
  },
  server: {
    port: 3000,
    strictPort: false,
    // Solo usar proxy si VITE_API_URL no está definida (desarrollo local)
    ...(process.env.VITE_API_URL ? {} : {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    }),
  },
  optimizeDeps: {
    exclude: [],
    include: ['react', 'react-dom', 'recharts'],
  },
})
