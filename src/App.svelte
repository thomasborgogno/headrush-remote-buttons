<script lang="ts">
  import { onMount } from 'svelte';
  import { readSnapshot, pressScene, toggleLatch, setHeld, HttpError, type Pedal, type Snapshot } from './core';
  import Setup from './Setup.svelte';
  import { getSetup, saveHost, rememberedHost, rememberHost } from './setup';
  import { t } from './i18n';

  type View = 'A' | 'B' | 'ALL';
  const VIEWS: { id: View; label: string }[] = [
    { id: 'A', label: t.bankA },
    { id: 'B', label: t.bankB },
    { id: 'ALL', label: t.all },
  ];

  function loadView(): View {
    try {
      const v = localStorage.getItem('view');
      if (v === 'A' || v === 'B' || v === 'ALL') return v;
    } catch {}
    return 'A';
  }

  let snap = $state<Snapshot | null>(null);
  let proxyDown = $state(false); // il server dell'app non risponde
  let coreDown = $state(false); // il server risponde ma non raggiunge il Core
  let setupOpen = $state(false);
  let setupDismissed = false;
  let view = $state<View>(loadView());
  const held = new Set<number>();

  function setView(v: View) {
    view = v;
    try { localStorage.setItem('view', v); } catch {}
  }

  // Disposizione fisica: riga alta = banco A (6..10), riga bassa = banco B (1..5)
  let rows = $derived.by(() => {
    const ps = snap?.pedals ?? [];
    const bank = (b: 'A' | 'B') => ps.filter((p) => p.bank === b);
    return view === 'ALL' ? [bank('A'), bank('B')] : [bank(view)];
  });

  let restoring = false;
  let restoreTried = false;
  let rememberedCurrent = false;

  function ok() {
    proxyDown = false;
    coreDown = false;
    // dopo il primo collegamento riuscito ricorda l'indirizzo anche nel browser
    if (!rememberedCurrent) {
      rememberedCurrent = true;
      getSetup().then((i) => i.reachable && rememberHost(i.host)).catch(() => {});
    }
  }

  // Il server non trova più il Core: prima di disturbare l'utente prova l'ultimo indirizzo noto al browser
  async function restoreRemembered() {
    restoring = true;
    const host = rememberedHost();
    try {
      if (host && (await saveHost(host)).ok) {
        restoring = false;
        refresh();
        return;
      }
    } catch {}
    restoring = false;
    if (!setupDismissed) setupOpen = true;
  }

  function fail(e: unknown) {
    if (e instanceof HttpError && e.coreUnreachable) {
      proxyDown = false;
      coreDown = true;
      if (restoring) return;
      if (!restoreTried) {
        restoreTried = true;
        restoreRemembered();
        return;
      }
      // se l'utente chiude il wizard non riaprirlo da solo
      if (!setupDismissed) setupOpen = true;
    } else {
      proxyDown = true;
    }
  }

  async function refresh() {
    try {
      snap = await readSnapshot();
      ok();
    } catch (e) {
      fail(e);
    }
  }

  async function run(action: Promise<unknown>) {
    try {
      await action;
      refresh();
    } catch (e) {
      fail(e);
    }
  }

  function closeSetup() {
    setupOpen = false;
    setupDismissed = true;
  }

  function down(e: PointerEvent, p: Pedal) {
    if (p.mode === 'empty') return;
    navigator.vibrate?.(15);
    if (p.mode === 'hold') {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      held.add(p.index);
      run(setHeld(p, true));
    }
  }

  function up(p: Pedal) {
    if (p.mode === 'hold' && held.delete(p.index)) run(setHeld(p, false));
  }

  function click(p: Pedal) {
    if (!snap) return;
    if (p.mode === 'scene') run(pressScene(p, snap.pedals));
    else if (p.mode === 'latch') run(toggleLatch(p));
  }

  // Non lasciare mai un pedale hold premuto se la pagina va in background
  function releaseAll() {
    for (const i of [...held]) {
      const p = snap?.pedals.find((x) => x.index === i);
      held.delete(i);
      if (p) run(setHeld(p, false));
    }
  }

  onMount(() => {
    refresh();
    const timer = setInterval(refresh, 700);
    document.addEventListener('visibilitychange', releaseAll);
    window.addEventListener('pagehide', releaseAll);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', releaseAll);
      window.removeEventListener('pagehide', releaseAll);
    };
  });

  const MODE_TAG: Record<string, string> = { latch: t.latch, hold: t.hold, scene: t.scene };
  let offline = $derived(proxyDown || coreDown);
</script>

<header>
  <span class="rig">{snap?.rig ?? '…'}</span>
  <nav>
    {#each VIEWS as v}
      <button class:sel={view === v.id} onclick={() => setView(v.id)}>{v.label}</button>
    {/each}
  </nav>
  <span class="tools">
    <button class="gear" aria-label={t.settings} title={t.settings} onclick={() => (setupOpen = true)}>⚙</button>
    <span class="dot" class:off={offline} title={offline ? t.coreUnreachable : t.connected}></span>
  </span>
</header>

<main class:offline>
  {#each rows as row}
    <section>
      {#each row as p (p.index)}
        {#if p.mode === 'empty'}
          <div class="pedal empty"><span class="num">{p.index}</span></div>
        {:else}
          <button
            class="pedal {p.mode}"
            class:on={p.on}
            style:--c={p.colour}
            onpointerdown={(e) => down(e, p)}
            onpointerup={() => up(p)}
            onpointercancel={() => up(p)}
            onclick={() => click(p)}
            oncontextmenu={(e) => e.preventDefault()}
          >
            <span class="num">{p.index} · {MODE_TAG[p.mode]}</span>
            <span class="label">{p.label}</span>
            {#if p.mode === 'scene' && p.states > 1}
              <span class="ab"><b class:sel={p.on && p.state === 0}>A</b><b class:sel={p.on && p.state === 1}>B</b></span>
            {:else if p.operation && p.operation !== 'On'}
              <span class="op">{p.operation}</span>
            {/if}
          </button>
        {/if}
      {/each}
    </section>
  {/each}
</main>

{#if offline && !setupOpen}
  <div class="banner">
    {proxyDown ? t.proxyUnreachable : t.coreUnreachable}
    {#if coreDown}<button onclick={() => (setupOpen = true)}>{t.settings}</button>{/if}
  </div>
{/if}

{#if setupOpen}
  <Setup onclose={closeSetup} onsaved={refresh} />
{/if}
