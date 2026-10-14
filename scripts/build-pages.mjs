// Prepara la cartella da pubblicare su GitHub Pages: il bundle (remote.js) e la pagina di istruzioni.
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { statSync } from 'node:fs';

const OUT = 'pages-dist';

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
copyFileSync('dist-bookmarklet/remote.js', `${OUT}/remote.js`);
copyFileSync('pages/index.html', `${OUT}/index.html`);
writeFileSync(`${OUT}/.nojekyll`, '');

console.log(`pages-dist/remote.js  ${(statSync(`${OUT}/remote.js`).size / 1024).toFixed(1)} kB`);
