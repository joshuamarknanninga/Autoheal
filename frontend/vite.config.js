import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({ fastRefresh: true })],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:5173',
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
      timeout: 120000,
      overlay: true
    }
  }
});
