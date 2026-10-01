import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '#components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '#hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
      '#services': fileURLToPath(new URL('./src/services', import.meta.url)),
      '#types': fileURLToPath(new URL('./src/types', import.meta.url)),
      '#assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '#': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
