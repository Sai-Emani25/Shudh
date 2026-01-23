import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  // In GitHub Actions, process.env.GEMINI_API_KEY is set
  // Locally, it comes from .env file via loadEnv
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || '';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    base: "/Shudh/",
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(apiKey),
      'process.env.GEMINI_API_KEY': JSON.stringify(apiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
