import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3001,
    proxy: {
      // Forward any request to /api/v1 to the backend server
      '/api/v1': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});