import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Use relative base path so the app works seamlessly on GitHub Pages, Render, subpaths, and LAN
  base: './',
  server: {
    host: '0.0.0.0', // Expose to local network (Wi-Fi) so mobile phones can connect
    port: 5173,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    cors: true,
  },
});
