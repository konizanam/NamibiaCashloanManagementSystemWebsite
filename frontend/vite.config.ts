import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Third arg '' loads every var (not just VITE_-prefixed ones), since these
  // values are for the dev server config and aren't shipped to the browser.
  const env = loadEnv(mode, '.', '');
  const port = Number.parseInt(env.FRONTEND_PORT || '3001', 10);
  const target = env.BACKEND_URL || 'http://localhost:5001';

  return {
    plugins: [react()],
    server: {
      port,
      proxy: {
        '/api':          { target, changeOrigin: true },
        '/openapi.json': { target, changeOrigin: true },
        '/docs':         { target, changeOrigin: true },
        '/uploads':      { target, changeOrigin: true },
      },
    },
  };
});
