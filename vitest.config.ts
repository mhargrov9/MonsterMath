import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts', '**/*.test.js'],
    exclude: ['node_modules/**', 'dist/**'],
    globals: true
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@': path.resolve(__dirname, './client/src')
    }
  },
  esbuild: {
    target: 'node18'
  }
});