import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // Allow Cloudflare Quick Tunnel links (https://*.trycloudflare.com) to reach the dev server.
  server: { allowedHosts: ['.trycloudflare.com'] },
});
