import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Flask on Windows often listens on IPv4 only; localhost → ::1 breaks the proxy with ECONNRESET */
function viteProxyBackendTarget(apiUrlEnv: string | undefined): string {
  const fallback = 'http://127.0.0.1:5000';
  const raw = (apiUrlEnv || '').trim();
  const base = raw || fallback;
  try {
    const u = new URL(base);
    if (u.hostname === 'localhost' || u.hostname === '::1') u.hostname = '127.0.0.1';
    return `${u.protocol}//${u.host}`;
  } catch {
    return fallback;
  }
}

export default defineConfig(({ mode }: { mode: string }) => {
  const env = loadEnv(mode, '.', '');
  const apiProxyTarget = viteProxyBackendTarget(env.VITE_API_URL);

  return {
    root: __dirname,
    publicDir: 'public',
    build: {
      outDir: 'dist',
    },
    server: {
      port: 3000,
      host: '0.0.0.0',

      // OPTIONAL (recommended): proxy /api to backend
      // If backend runs on same machine as frontend:
      proxy: {
        '/api': {
          target: apiProxyTarget,
          changeOrigin: true,
        },
      },
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    resolve: {
      alias: {
        '@': resolve(__dirname, './src'),
      },
    },
  };
});
