import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    TanStackRouterVite(),
    react(),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3222',
        changeOrigin: true,
        // Configure proxy to handle SSE streaming
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Disable buffering for SSE endpoints
            if (req.url?.includes('/queue/stream')) {
              proxyReq.setHeader('X-Accel-Buffering', 'no');
            }
          });
        },
      },
    },
  },
});
