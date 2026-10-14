const FS = '/api/v1/object-properties/Evil/Engine/FootSwitch';
const RIG = '/api/v1/object-properties/Evil/Engine/Patch/Rig';

// Ordine di FootSwitchColourN esposto dall'Headrush (-1 = non assegnato)
const COLOURS = ['#2a2a30', '#2ecc71', '#1e8449', '#f1c40f', '#ff8c1a', '#e74c3c', '#ff6fb5',
  '#9b59b6', '#3b6fe0', '#5dade2', '#f5f5f5', '#8a8f98', '#1abc9c', '#111'];

// ModeNewN: 0 = Toggle (latch), 1 = Hold (momentaneo), 2 = Scene
export type Mode = 'latch' | 'hold' | 'scene' | 'empty';
export type Bank = 'A' | 'B';

export interface Pedal {
  index: number; // 1..10, come nel nome delle proprietà
  bank: Bank; // A = 6..10, B = 1..5
  mode: Mode;
  label: string;
  module: string;
  operation: string;
  colour: string;
  on: boolean;
  states: number; // numero di stati della scena (1 o 2)
  state: number; // 0 = A, 1 = B
}
export interface Snapshot { rig: string; pedals: Pedal[] }

type Props = Record<string, unknown>;
const OVERRIDE_MS = 1500;
const overrides = new Map<string, { value: unknown; until: number }>();

async function getJson(url: string): Promise<Props> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// L'app può scrivere solo lo stato "live" di scene e pedali. Qualsiasi altra proprietà viene rifiutata
// qui, prima della rete: il codice gira direttamente nella pagina dell'Headrush, con gli stessi poteri dell'editor.
const WRITABLE: Record<string, (v: unknown) => boolean> = {
  SceneActive: (v) => v === true,
  SceneState: (v) => v === 0 || v === 1,
  FootSwitchOn: (v) => typeof v === 'boolean',
  FootswitchHeld: (v) => typeof v === 'boolean',
};

export function assertWritable(props: Props) {
  for (const [key, value] of Object.entries(props)) {
    const m = key.match(/^(SceneActive|SceneState|FootSwitchOn|FootswitchHeld)(10|[1-9])$/);
    if (!m || !WRITABLE[m[1]](value)) throw new Error(`Scrittura non consentita: ${key}`);
  }
}

async function put(props: Props) {
  assertWritable(props);
  const res = await fetch(FS, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(props),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

// Aggiorna lo schermo subito; l'Headrush resta la fonte di verità (l'override scade o viene confermato)
function optimistic(props: Props) {
  const until = Date.now() + OVERRIDE_MS;
  for (const [k, value] of Object.entries(props)) overrides.set(k, { value, until });
}

// `local` = valori solo per lo schermo (non inviati all'Headrush)
async function write(props: Props, local: Props = {}) {
  const shown = { ...local, ...props };
  optimistic(shown);
  try {
    await put(props);
  } catch (e) {
    for (const k of Object.keys(shown)) overrides.delete(k);
    throw e;
  }
}

function applyOverrides(fs: Props) {
  const now = Date.now();
  for (const [k, o] of overrides) {
    if (o.until < now || fs[k] === o.value) overrides.delete(k);
    else fs[k] = o.value;
  }
}

export async function readSnapshot(): Promise<Snapshot> {
  const [fs, rig] = await Promise.all([getJson(FS), getJson(RIG)]);
  applyOverrides(fs);
  const pedals: Pedal[] = [];
  for (let i = 1; i <= 10; i++) {
    const module = (fs[`Module${i}`] as string) ?? 'Unassigned';
    const modeNum = fs[`ModeNew${i}`] as number;
    const mode: Mode = module === 'Unassigned' && modeNum !== 2 ? 'empty'
      : modeNum === 2 ? 'scene' : modeNum === 1 ? 'hold' : 'latch';
    const colourIdx = fs[`FootSwitchColour${i}`] as number;
    pedals.push({
      index: i,
      bank: i >= 6 ? 'A' : 'B',
      mode,
      label: (fs[`FootSwitchText${i}`] as string) || (mode === 'scene' ? `Scene ${i}` : module),
      module,
      operation: (fs[`Operation${i}`] as string) ?? '',
      colour: COLOURS[colourIdx] ?? COLOURS[0],
      on: mode === 'scene' ? !!fs[`SceneActive${i}`] : !!fs[`FootswitchHeld${i}`] || !!fs[`FootSwitchOn${i}`],
      states: (fs[`SceneNumberOfStates${i}`] as number) ?? 1,
      state: (fs[`SceneState${i}`] as number) ?? 0,
    });
  }
  return { rig: (rig.PresetName as string) ?? '', pedals };
}

/** Scene: attiva la scena; se è già attiva e ha due stati, alterna A/B. */
export function pressScene(p: Pedal, all: Pedal[]) {
  if (p.on && p.states > 1) return write({ [`SceneState${p.index}`]: p.state ? 0 : 1 });
  // L'Headrush vuole solo SceneActive=true sulla scena scelta: scrivere false sulle altre
  // viene ignorato o annulla la selezione. Le altre le spegniamo solo a schermo.
  const local: Props = {};
  for (const o of all) if (o.mode === 'scene' && o.index !== p.index) local[`SceneActive${o.index}`] = false;
  return write({ [`SceneActive${p.index}`]: true }, local);
}

/** Latch: inverte lo stato on/off. */
export function toggleLatch(p: Pedal) {
  return write({ [`FootSwitchOn${p.index}`]: !p.on });
}

/** Hold: attivo finché il pedale è premuto. */
export function setHeld(p: Pedal, held: boolean) {
  return write({ [`FootswitchHeld${p.index}`]: held });
}
