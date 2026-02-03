import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ mode }: { mode: string }) => {
  const env = loadEnv(mode, '.', '');

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
          target: env.VITE_API_URL || 'http://localhost:5000',
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
