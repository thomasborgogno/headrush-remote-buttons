import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'node:child_process';

// Hash del commit + data: compare nel pannello Help e nel rapporto diagnostico
function build(): string {
  let hash = 'dev';
  try {
    hash = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || hash;
  } catch {
    // niente git: resta "dev"
  }
  return `${hash} ${new Date().toISOString().slice(0, 10)}`;
}

// Bundle unico (JS + CSS) da iniettare nella pagina dell'Headrush con un segnalibro.
export default defineConfig({
  plugins: [svelte({ compilerOptions: { css: 'injected' } })],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __BUILD__: JSON.stringify(build()),
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
