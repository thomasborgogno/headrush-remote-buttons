<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from './i18n';
  import { getSetup, saveHost, scanNetwork, type Found } from './setup';

  let { onclose, onsaved }: { onclose: () => void; onsaved: () => void } = $props();

  let host = $state('');
  let current = $state<{ host: string; rig: string | null } | null>(null);
  let busy = $state(false);
  let scanning = $state(false);
  let found = $state<Found[] | null>(null);
  let msg = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);

  onMount(async () => {
    try {
      const info = await getSetup();
      current = { host: info.host, rig: info.rig };
      host = info.host;
    } catch {
      msg = { kind: 'err', text: t.errServer };
    }
  });

  async function connect(address = host) {
    if (!address.trim()) return;
    busy = true;
    msg = null;
    try {
      const r = await saveHost(address);
      if (r.ok) {
        host = r.host;
        current = { host: r.host, rig: r.rig };
        msg = { kind: 'ok', text: t.ok(r.rig) };
        onsaved();
        setTimeout(onclose, 1200);
      } else {
        msg = { kind: 'err', text: r.error === 'invalid' ? t.errInvalid : t.errUnreachable };
      }
    } catch {
      msg = { kind: 'err', text: t.errServer };
    }
    busy = false;
  }

  async function search() {
    scanning = true;
    found = null;
    msg = null;
    try {
      found = await scanNetwork();
      // un solo risultato: proponilo direttamente nel campo
      if (found.length === 1) host = found[0].host;
    } catch {
      msg = { kind: 'err', text: t.errServer };
    }
    scanning = false;
  }
</script>

<div class="overlay" role="dialog" aria-modal="true" aria-label={t.setupTitle}>
  <form class="card" onsubmit={(e) => { e.preventDefault(); connect(); }}>
    <h2>{t.setupTitle}</h2>
    <p class="intro">{t.setupIntro}</p>

    {#if current}
      <p class="current">{t.currentCore}: <b>{current.host}</b> {current.rig ? `· ${current.rig}` : ''}</p>
    {/if}

    <label>
      {t.address}
      <input bind:value={host} placeholder={t.addressHint} inputmode="url" autocomplete="off" autocapitalize="off" spellcheck="false" />
    </label>

    <div class="row">
      <button type="submit" class="primary" disabled={busy || scanning || !host.trim()}>
        {busy ? t.testing : t.connect}
      </button>
      <button type="button" onclick={search} disabled={busy || scanning}>
        {scanning ? t.scanning : t.scan}
      </button>
    </div>

    {#if found}
      {#if found.length === 0}
        <p class="err">{t.scanNone}</p>
      {:else}
        <p class="intro">{t.scanFound}</p>
        <ul>
          {#each found as f (f.host)}
            <li><button type="button" onclick={() => connect(f.host)} disabled={busy}>{f.host} <small>· {f.rig}</small></button></li>
          {/each}
        </ul>
      {/if}
    {/if}

    {#if msg}<p class={msg.kind}>{msg.text}</p>{/if}

    <button type="button" class="link" onclick={onclose}>{t.close}</button>
  </form>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .75); display: grid; place-items: center; padding: 16px; z-index: 10; overflow: auto; }
  .card { width: min(520px, 100%); background: #17171d; border: 2px solid #2a2a33; border-radius: 18px; padding: 20px;
    display: flex; flex-direction: column; gap: 14px; }
  h2 { margin: 0; font-size: 1.3rem; }
  p { margin: 0; line-height: 1.4; }
  .intro { opacity: .75; font-size: .95rem; }
  .current { font-size: .95rem; }
  label { display: flex; flex-direction: column; gap: 6px; font-weight: 600; }
  input { font: inherit; padding: 12px; border-radius: 10px; border: 2px solid #34343e; background: #0b0b0f; color: inherit; user-select: text; -webkit-user-select: text; }
  input:focus { outline: none; border-color: #ff5a1f; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; }
  button { font: inherit; font-weight: 600; padding: 12px 16px; border-radius: 10px; border: 2px solid #34343e; background: #20202a; color: inherit; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  button.primary { background: #ff5a1f; border-color: #ff5a1f; color: #000; }
  button.link { background: none; border: 0; opacity: .7; align-self: flex-end; padding: 4px 8px; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  li button { width: 100%; text-align: left; }
  small { opacity: .7; font-weight: 400; }
  .ok { color: #2ecc71; }
  .err { color: #ff6b5e; }
</style>
