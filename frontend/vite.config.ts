import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react_vendor: ['react', 'react-dom', 'react-router-dom', 'zustand'],
          motion_vendor: ['framer-motion', 'gsap'],
          media_vendor: ['howler'],
          socket_vendor: ['socket.io-client'],
        },
      },
    },
  },
});
