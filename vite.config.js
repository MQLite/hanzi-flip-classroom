import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  preview: { host: '127.0.0.1', port: 5174, strictPort: true },
  test: { include: ['tests/**/*.test.js'], environment: 'node' },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (path.includes('/node_modules/three/')) return 'three';
          if (path.includes('/node_modules/hanzi-writer/')) return 'handwriting';
        },
      },
    },
  },
});
