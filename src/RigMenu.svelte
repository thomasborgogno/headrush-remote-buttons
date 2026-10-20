<script lang="ts">
  import { onMount } from 'svelte';
  import { t } from './i18n';
  import type { RigList } from './headrush';

  let { list, busy, onpick, onclose }: {
    list: RigList | null;
    busy: boolean;
    onpick: (index: number) => void;
    onclose: () => void;
  } = $props();

  let listEl: HTMLUListElement | undefined = $state();

  // Con tante voci (la libreria può avere 100+ rig) apri il menu già scorso fino al rig attuale
  onMount(() => {
    const cur = listEl?.querySelector<HTMLElement>('.current');
    if (!listEl || !cur) return;
    const offset = cur.getBoundingClientRect().top - listEl.getBoundingClientRect().top + listEl.scrollTop;
    listEl.scrollTop = offset - listEl.clientHeight / 2 + cur.offsetHeight / 2;
  });

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') onclose();
  }
</script>

<svelte:window onkeydown={onKey} />

<div class="overlay" role="presentation" onclick={(e) => { if (e.target === e.currentTarget) onclose(); }}>
  <div class="card" role="dialog" aria-modal="true" aria-label={t.menuTitle}>
    <h2>{t.menuTitle}</h2>
    {#if list?.setlist}<p class="muted">{list.setlist}</p>{/if}

    {#if !list || list.rigs.length === 0}
      <p class="muted">{t.noRigs}</p>
    {:else}
      <ul bind:this={listEl}>
        {#each list.rigs as rig, i (rig.id + rig.srId)}
          <li>
            <button type="button" class:current={i === list.current} disabled={busy} onclick={() => onpick(i)}>
              <span class="n">{i + 1}</span>
              <span class="name">{rig.name}</span>
              {#if i === list.current}<span class="tick" aria-hidden="true">●</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <button type="button" class="close" onclick={onclose}>{t.close}</button>
  </div>
</div>

<style>
  .overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, .75); display: grid; place-items: center; padding: 16px; z-index: 10; }
  /* L'altezza va fissata in modo esplicito: così la lista scorre invece di allungare il pannello oltre lo schermo */
  .card { width: min(520px, 100%); max-height: calc(100vh - 32px); max-height: calc(100dvh - 32px); display: flex; flex-direction: column;
    gap: 10px; background: #17171d; border: 2px solid #2a2a33; border-radius: 18px; padding: 18px; color: #f2f2f5; }
  /* L'editor dell'Headrush imposta min-height:0 su tutto: senza queste regole gli elementi flex si schiacciano e si sovrappongono */
  .card > * { flex-shrink: 0; }
  h2 { margin: 0; font-size: 1.25rem; }
  p { margin: 0; }
  .muted { opacity: .7; }
  .card > ul { flex: 1 1 auto; flex-shrink: 1; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: 0;
    display: flex; flex-direction: column; gap: 8px; }
  li { flex: none; }
  li button { width: 100%; display: flex; align-items: center; gap: 12px; text-align: left; font: inherit; font-size: 1.05rem;
    padding: 14px 14px; min-height: 52px; border-radius: 12px; border: 2px solid #34343e; background: #20202a; color: inherit; cursor: pointer; }
  li button:disabled { opacity: .6; cursor: default; }
  li button.current { border-color: #ff5a1f; background: #2a1d17; }
  .n { opacity: .5; min-width: 1.6em; font-variant-numeric: tabular-nums; }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; }
  .tick { color: #ff5a1f; }
  .close { align-self: flex-end; font: inherit; font-weight: 600; background: none; border: 0; color: inherit; opacity: .7; padding: 12px 8px; cursor: pointer; }
</style>
