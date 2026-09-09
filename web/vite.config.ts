import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.',
  server: {
    port: parseInt(process.env.WEB_PORT || '5173'),
    proxy: {
      '/api': {
        target: `http://localhost:${process.env.AGENT_PORT || 3001}`,
        changeOrigin: true,
      },
    },
  },
});
