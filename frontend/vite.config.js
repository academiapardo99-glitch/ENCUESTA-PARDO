import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El frontend se comunica con la API por HTTP. En desarrollo se usa un proxy
// para evitar problemas de CORS y que las rutas relativas /api funcionen igual
// en desarrollo y en producción.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
});

