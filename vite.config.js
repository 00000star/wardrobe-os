import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/wardrobe-os/',
  plugins: [react()],
  optimizeDeps: {
    noDiscovery: true,
  },
});
