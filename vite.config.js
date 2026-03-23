import { defineConfig, loadEnv } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [preact()],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
    server: {
      proxy: {
        '/api': {
          target: env.WELGO_DESK_BACKEND_URL || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  };
});
