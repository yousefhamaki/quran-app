import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // Allow Cloudflare Quick Tunnel links (https://*.trycloudflare.com) to reach the dev server.
  server: { allowedHosts: ['.trycloudflare.com'] },
});
