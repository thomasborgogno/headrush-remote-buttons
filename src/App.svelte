<script lang="ts">
  import { onMount } from 'svelte';
  import { readSnapshot, pressScene, toggleLatch, setHeld, type Pedal, type Snapshot } from './headrush';
  import { t, MODE_TAG } from './i18n';
  import { log } from './log';
  import Help from './Help.svelte';

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
  let offline = $state(false);
  let view = $state<View>(loadView());
  let helpOpen = $state(false);
  const held = new Set<number>();

  function setView(v: View) {
    view = v;
    try { localStorage.setItem('view', v); } catch {}
  }

  // Disposizione fisica: riga alta = banco A (seconda metà dei pedali), riga bassa = banco B (prima metà)
  let rows = $derived.by(() => {
    const ps = snap?.pedals ?? [];
    const bank = (b: 'A' | 'B') => ps.filter((p) => p.bank === b);
    return view === 'ALL' ? [bank('A'), bank('B')] : [bank(view)];
  });

  async function refresh() {
    try {
      snap = await readSnapshot();
      if (offline) log('info', 'connection restored');
      offline = false;
    } catch (e) {
      if (!offline) log('error', `connection lost: ${e instanceof Error ? e.message : e}`);
      offline = true;
    }
  }

  async function run(action: Promise<unknown>) {
    try {
      await action;
      refresh();
    } catch {
      offline = true;
    }
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
</script>

<header>
  <span class="rig">{snap?.rig ?? '…'}</span>
  <nav>
    {#each VIEWS as v}
      <button class:sel={view === v.id} onclick={() => setView(v.id)}>{v.label}</button>
    {/each}
  </nav>
  <span class="tools">
    <span class="dot" class:off={offline} title={offline ? t.unreachable : t.connected}></span>
    <button class="help" aria-label={t.help} title={t.help} onclick={() => (helpOpen = true)}>?</button>
  </span>
</header>

<main class:offline style:--cols={snap?.perBank ?? 5}>
  {#each rows as row}
    {@const visible = row.filter((x) => x.mode !== 'empty')}
    <section>
      {#each row as p (p.index)}
        {#if p.mode === 'empty'}
          <div class="pedal empty"><span class="num">{p.index}</span></div>
        {:else}
          <button
            class="pedal {p.mode}"
            class:on={p.on}
            class:wide={visible.length % 2 === 1 && p.index === visible[visible.length - 1].index}
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

{#if offline}<div class="banner">{t.unreachable}</div>{/if}

{#if helpOpen}<Help {snap} onclose={() => (helpOpen = false)} />{/if}
