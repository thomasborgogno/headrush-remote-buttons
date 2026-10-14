// Punto di ingresso della versione "senza server": viene eseguito DENTRO la pagina dell'editor del Core
// (http://<core>/), quindi le chiamate all'API sono della stessa origine.
import { mount } from 'svelte';
import css from './app.css?inline';
import App from './App.svelte';

const VIEWPORT = 'width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no';
const flag = window as unknown as { __headrushRemoteButtons?: boolean };

if (!flag.__headrushRemoteButtons) {
  flag.__headrushRemoteButtons = true;

  // L'editor ufficiale fissa il viewport a 1360px: su un telefono la nostra interfaccia risulterebbe minuscola
  let meta = document.getElementById('metaViewport') ?? document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', VIEWPORT);

  // Non smontiamo l'editor (React): lo nascondiamo e ci mettiamo sopra a schermo intero
  document.getElementById('root')?.style.setProperty('display', 'none');

  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const host = document.createElement('div');
  host.id = 'app';
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:#0b0b0f';
  document.body.appendChild(host);
  document.title = 'Headrush Remote Buttons';

  mount(App, { target: host });
}
