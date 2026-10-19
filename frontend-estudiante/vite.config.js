import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Portal público del estudiante. Se sirve en un puerto distinto al panel
// administrativo (5173) y usa el mismo proxy hacia la API para evitar CORS.
export default defineConfig({
  // En el despliegue de Cloud Run el portal se sirve en la RAÍZ del dominio
  // (Dockerfile compila con VITE_BASE=/). En desarrollo conserva '/'.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4174,
  },
});
