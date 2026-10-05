import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tailwindcss(),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler', {}]],
      },
    }),
  ],
  resolve: {
    alias: {
      '#components': path.resolve(__dirname, './src/components'),
      '#hooks': path.resolve(__dirname, './src/hooks'),
      '#services': path.resolve(__dirname, './src/services'),
      '#types': path.resolve(__dirname, './src/types'),
      '#pages': path.resolve(__dirname, './src/pages'),
      '#layouts': path.resolve(__dirname, './src/layouts'),
      '#': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
