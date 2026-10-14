// Prepara la cartella da pubblicare su GitHub Pages: il bundle con nome legato al contenuto
// e la pagina di istruzioni con l'impronta SRI del bundle già inserita.
import { createHash } from 'node:crypto';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const OUT = 'pages-dist';
const js = readFileSync('dist-bookmarklet/remote.js');

const integrity = 'sha384-' + createHash('sha384').update(js).digest('base64');
const file = `remote-${createHash('sha256').update(js).digest('hex').slice(0, 12)}.js`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/${file}`, js);
writeFileSync(
  `${OUT}/index.html`,
  readFileSync('pages/index.html', 'utf8').replace('__FILE__', file).replace('__INTEGRITY__', integrity),
);
writeFileSync(`${OUT}/.nojekyll`, '');

console.log(`pages-dist/${file}  ${(js.length / 1024).toFixed(1)} kB\n${integrity}`);
