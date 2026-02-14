import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

function normalizeBasePath(basePath: string) {
  if (!basePath || basePath === '/') {
    return '/';
  }
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const base = normalizeBasePath(env.VITE_BASE_PATH || '/');

  return {
    base,
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
  };
});
