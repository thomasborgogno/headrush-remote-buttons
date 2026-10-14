import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Headrush Remote Buttons',
        short_name: 'Remote Buttons',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b0b0f',
        theme_color: '#0b0b0f',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { navigateFallbackDenylist: [/^\/api\//] },
    }),
  ],
  server: { host: true, proxy: { '/api': 'http://localhost:8787' } },
});
