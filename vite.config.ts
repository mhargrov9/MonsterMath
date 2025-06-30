import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './client/src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  // The 'root' is still 'client', where our source files are.
  root: 'client',
  build: {
    // The output directory is now '../dist', relative to the root.
    // This places the built files in the top-level 'dist' folder.
    outDir: '../dist',
    emptyOutDir: true,
  },
});