import { log } from './log';

const FS = '/api/v1/object-properties/Evil/Engine/FootSwitch';
const RIG = '/api/v1/object-properties/Evil/Engine/Patch/Rig';
const GUI = '/api/v1/object-properties/Evil/Gui';
const RIGS = '/api/v1/object-properties/Evil/API/Rigs';
const SETLISTS = '/api/v1/object-properties/Evil/API/Setlists';
const RIGS_METHOD = '/api/v1/object-method/Evil/API/Rigs';

// Ordine di FootSwitchColourN esposto dall'Headrush (-1 = non assegnato)
const COLOURS = ['#2a2a30', '#2ecc71', '#1e8449', '#f1c40f', '#ff8c1a', '#e74c3c', '#ff6fb5',
  '#9b59b6', '#3b6fe0', '#5dade2', '#f5f5f5', '#8a8f98', '#1abc9c', '#111'];

// ModeNewN: 0 = Toggle (latch), 1 = Hold (momentaneo), 2 = Scene
export type Mode = 'latch' | 'hold' | 'scene' | 'empty';
export type Bank = 'A' | 'B';

export interface Pedal {
  index: number; // 1..N, come nel nome delle proprietà
  bank: Bank; // B = prima metà (1..N/2), A = seconda metà (es. Core: B = 1..5, A = 6..10)
  mode: Mode;
  label: string;
  module: string;
  operation: string;
  colour: string;
  on: boolean;
  states: number; // numero di stati della scena (1 o 2)
  state: number; // 0 = A, 1 = B
}
export interface Snapshot { rig: string; pedals: Pedal[]; perBank: number }

// Core = 10 pedali; Prime e Flex Prime ne hanno un numero diverso: lo ricaviamo dalle proprietà esposte.
const MAX_PEDALS = 32;
const DEFAULT_PEDALS = 10;
function countPedals(fs: Props): number {
  let n = 0;
  for (const k of Object.keys(fs)) {
    const m = k.match(/^ModeNew(\d+)$/);
    if (m) n = Math.max(n, Math.min(+m[1], MAX_PEDALS));
  }
  return n || DEFAULT_PEDALS;
}

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
    const m = key.match(/^(SceneActive|SceneState|FootSwitchOn|FootswitchHeld)([1-9]|[1-2]\d|3[0-2])$/);
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
  const keys = Object.keys(props).join(',');
  try {
    await put(props);
    log('write', keys);
  } catch (e) {
    for (const k of Object.keys(shown)) overrides.delete(k);
    log('error', `write ${keys}: ${e instanceof Error ? e.message : e}`);
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

let lastCount = 0;

export interface DeviceInfo {
  deviceName?: string;
  appVersion?: string; // firmware
  product?: string; // codice prodotto interno (es. HV01)
  capabilities: string; // flag hardware esposti dall'API dei rig (hasSongView, is4Inch...)
  keyGroups: Record<string, number>; // nome della proprietà con le cifre sostituite da #, e quante ce ne sono
}

/** Modello, firmware e struttura delle proprietà dei footswitch: serve a capire modelli diversi dalla Core. */
export async function getDeviceInfo(): Promise<DeviceInfo> {
  const [gui, rigs, fs] = await Promise.all([
    getJson(GUI).catch(() => ({} as Props)),
    getJson(RIGS).catch(() => ({} as Props)),
    getJson(FS),
  ]);
  const keyGroups: Record<string, number> = {};
  for (const k of Object.keys(fs)) {
    const g = k.replace(/\d+/g, '#');
    keyGroups[g] = (keyGroups[g] ?? 0) + 1;
  }
  const str = (v: unknown) => (typeof v === 'string' ? v : undefined);
  const capabilities = ['hasSongView', 'is4Inch', 'hasVocals', 'hasExtAmp', 'hasAltOut', 'hasSeperateOutput', 'hasExternalStorage']
    .filter((k) => k in rigs)
    .map((k) => `${k}=${rigs[k]}`)
    .join(' ');
  return { deviceName: str(gui.DeviceName), appVersion: str(gui.AppVersion), product: str(rigs.product), capabilities, keyGroups };
}

// --- Rig della setlist corrente ---------------------------------------------------------------------

export interface RigItem { id: string; srId: string; name: string }
export interface RigList {
  setlist: string; // nome della setlist corrente
  rigs: RigItem[]; // nell'ordine della setlist
  current: number; // indice del rig caricato (-1 se non è nella setlist)
  dirty: boolean; // il rig caricato ha modifiche non salvate
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);

export async function readRigs(): Promise<RigList> {
  const [rigs, lists] = await Promise.all([getJson(RIGS), getJson(SETLISTS)]);
  const ids = strings(rigs.RigIds);
  const names = strings(rigs.RigNames);
  const srIds = strings(rigs.RigSrIds);
  const items = ids.map((id, i) => ({ id, srId: srIds[i] ?? '', name: names[i] || `Rig ${i + 1}` }));
  // come l'editor ufficiale: il rig attuale si riconosce da id + srId
  const current = items.findIndex((r) => r.id === rigs.loadedID && r.srId === String(rigs.loadedSrID ?? ''));
  return { setlist: String(lists.loadedName ?? ''), rigs: items, current, dirty: !!rigs.dirty };
}

/** Indice del rig precedente/successivo con ritorno all'inizio/alla fine, come nell'editor ufficiale. */
export function stepIndex(list: RigList, delta: number): number {
  const n = list.rigs.length;
  let i = list.current + delta;
  if (i >= n) i = 0;
  if (i < 0) i = n - 1;
  return i;
}

// L'unica chiamata di metodo che l'app può fare: caricare un rig della setlist corrente.
// Salvare, rinominare o eliminare rig è vietato qui, prima della rete.
const ALLOWED_METHODS = new Set(['loadRigConfirm']);

export function assertMethodAllowed(method: string, args: unknown[], list: RigList) {
  const [id, srId] = args;
  if (!ALLOWED_METHODS.has(method)) throw new Error(`Chiamata non consentita: ${method}`);
  if (args.length !== 2 || !list.rigs.some((r) => r.id === id && r.srId === srId)) {
    throw new Error('Rig non presente nella setlist corrente');
  }
}

async function callRigMethod(method: string, args: string[], list: RigList) {
  assertMethodAllowed(method, args, list);
  const res = await fetch(`${RIGS_METHOD}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ arguments: args }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const out = (await res.json()) as { methodReturnValue?: unknown };
  if (out.methodReturnValue === false) throw new Error(`${method} rifiutato dal dispositivo`);
}

/**
 * Carica il rig `index` della setlist. Se il rig attuale ha modifiche non salvate chiede conferma
 * (`confirmDiscard`) perché cambiare rig le scarta. Restituisce false se l'utente annulla.
 */
export async function loadRigAt(list: RigList, index: number, confirmDiscard: () => boolean): Promise<boolean> {
  const rig = list.rigs[index];
  if (!rig) return false;
  // la lista può avere qualche secondo: rileggiamo "dirty" adesso
  const fresh = await getJson(RIGS);
  if (fresh.dirty && !confirmDiscard()) {
    log('info', 'rig change cancelled (unsaved changes)');
    return false;
  }
  try {
    await callRigMethod('loadRigConfirm', [rig.id, rig.srId], list);
    log('write', `loadRig ${index + 1}/${list.rigs.length}`);
    return true;
  } catch (e) {
    log('error', `loadRig ${index + 1}/${list.rigs.length}: ${e instanceof Error ? e.message : e}`);
    throw e;
  }
}

export async function readSnapshot(): Promise<Snapshot> {
  const [fs, rig] = await Promise.all([getJson(FS), getJson(RIG)]);
  applyOverrides(fs);
  const count = countPedals(fs);
  const perBank = Math.ceil(count / 2);
  if (count !== lastCount) {
    log('info', `pedals detected: ${count} (per bank ${perBank})`);
    lastCount = count;
  }
  const pedals: Pedal[] = [];
  for (let i = 1; i <= count; i++) {
    const module = (fs[`Module${i}`] as string) ?? 'Unassigned';
    const modeNum = fs[`ModeNew${i}`] as number;
    const mode: Mode = module === 'Unassigned' && modeNum !== 2 ? 'empty'
      : modeNum === 2 ? 'scene' : modeNum === 1 ? 'hold' : 'latch';
    const colourIdx = fs[`FootSwitchColour${i}`] as number;
    pedals.push({
      index: i,
      bank: i > perBank ? 'A' : 'B',
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
  return { rig: (rig.PresetName as string) ?? '', pedals, perBank };
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
