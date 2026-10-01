import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    watch: false,
    include: ['src/**/*.spec.ts', 'tests/**/*.spec.ts'],
  },
  resolve: {
    alias: [
      { find: /^#(.*)$/, replacement: path.resolve(__dirname, 'src/$1') },
    ],
  },
});
