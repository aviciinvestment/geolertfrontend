import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'path'

export default defineConfig(({ mode }) => {
  // loadEnv with an empty prefix loads every variable from the .env files
  // (no VITE_ required). We then expose only the whitelist below to the client.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = mode === 'production'
    ? 'https://geolertbackend.onrender.com'
    : (env.API_URL || 'http://localhost:5000');

  const exposedEnv = [
    'API_URL',
    'GOOGLE_CLIENT_ID',
    'FOUNDER_EMAIL',
    'GEMINI_API_KEY',
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_MEASUREMENT_ID',
  ];

  const define: Record<string, string> = {};
  for (const key of exposedEnv) {
    define[`import.meta.env.${key}`] = JSON.stringify(env[key] ?? '');
  }

  return {
    define,
    plugins: [
      react(),
      ...(mode === 'production' ? [] : [basicSsl()]),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: apiTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})