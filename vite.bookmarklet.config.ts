import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

// Bundle unico (JS + CSS) da iniettare nella pagina dell'Headrush con un segnalibro.
export default defineConfig({
  plugins: [svelte({ compilerOptions: { css: 'injected' } })],
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
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
