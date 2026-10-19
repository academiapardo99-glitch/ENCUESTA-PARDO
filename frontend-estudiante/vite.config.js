import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Portal público del estudiante. Se sirve en un puerto distinto al panel
// administrativo (5173) y usa el mismo proxy hacia la API para evitar CORS.
export default defineConfig({
  // En producción, el portal público se sirve desde el mismo dominio bajo
  // /estudiante; en desarrollo conserva la ruta raíz del servidor Vite.
  base: process.env.VITE_BASE ?? (process.env.NODE_ENV === 'production' ? '/estudiante/' : '/'),
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
