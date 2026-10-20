<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from './i18n';
  import { buildReport, BUILD, REPO } from './report';
  import type { Snapshot } from './headrush';

  let { snap, onclose }: { snap: Snapshot | null; onclose: () => void } = $props();

  let text = $state('');
  let issueUrl = $state(`${REPO}/issues/new`);
  let ready = $state(false);

  onMount(async () => {
    const r = await buildReport(snap);
    text = r.text;
    issueUrl = r.issueUrl;
    ready = true;
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div class="card" role="dialog" aria-modal="true" aria-label={t.helpTitle}>
    <h2>{t.helpTitle}</h2>
    <p>{t.helpIntro}</p>

    <div class="row">
      <a class="btn primary" class:wait={!ready} href={issueUrl} target="_blank" rel="noopener noreferrer">
        {ready ? t.openGithub : t.preparing}
      </a>
    </div>

    <details>
      <summary>{t.showLog}</summary>
      <textarea readonly rows="10" value={text} spellcheck="false"></textarea>
    </details>

    <p class="muted">{t.privacy}</p>

    <div class="row">
      <button type="button" onclick={() => location.reload()}>{t.backEditor}</button>
      <button type="button" class="link" onclick={onclose}>{t.close}</button>
    </div>
    <p class="muted small">{t.version}: {BUILD}</p>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .75); display: grid; place-items: center; padding: 16px; z-index: 10; overflow: auto; }
  .card { width: min(560px, 100%); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); overflow: auto; background: #17171d; border: 2px solid #2a2a33; border-radius: 18px; padding: 20px;
    display: flex; flex-direction: column; gap: 14px; color: #f2f2f5; }
  .card > * { flex-shrink: 0; } /* l'editor imposta min-height:0 su tutto: evita che gli elementi si schiaccino */
  h2 { margin: 0; font-size: 1.3rem; }
  p { margin: 0; line-height: 1.45; }
  .muted { opacity: .7; font-size: .9rem; }
  .small { font-size: .8rem; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .btn, button { font: inherit; font-weight: 600; padding: 12px 16px; border-radius: 10px; border: 2px solid #34343e;
    background: #20202a; color: inherit; cursor: pointer; text-decoration: none; display: inline-block; }
  .primary { background: #ff5a1f; border-color: #ff5a1f; color: #000; }
  .wait { opacity: .6; }
  .link { background: none; border: 0; opacity: .7; padding: 12px 8px; }
  summary { cursor: pointer; font-weight: 600; margin-bottom: 8px; }
  textarea { width: 100%; box-sizing: border-box; font: .75rem/1.4 ui-monospace, monospace; background: #0b0b0f; color: #d6d6dc;
    border: 2px solid #34343e; border-radius: 10px; padding: 10px; resize: vertical; user-select: text; -webkit-user-select: text; }
</style>
