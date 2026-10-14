import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Bundle unico (JS + CSS) da iniettare nella pagina del Core con un segnalibro. Niente PWA/service worker.
export default defineConfig({
  plugins: [svelte({ compilerOptions: { css: 'injected' } })],
  define: {
    'import.meta.env.VITE_DIRECT': JSON.stringify('1'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  publicDir: false,
  build: {
    outDir: 'dist-bookmarklet',
    emptyOutDir: true,
    lib: {
      entry: 'src/bookmarklet.ts',
      name: 'HeadrushRemoteButtons',
      formats: ['iife'],
      fileName: () => 'remote.js',
    },
  },
});
