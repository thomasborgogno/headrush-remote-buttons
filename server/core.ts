import { networkInterfaces } from 'node:os';
import { DEFAULT_HOST } from './config.ts';

const RIG_PATH = '/api/v1/object-properties/Evil/Engine/Patch/Rig';

/**
 * Accetta "192.168.1.136", "http://192.168.1.136/", "HeadRushCore.local", "host:8080".
 * Restituisce null se non è un indirizzo di rete locale: il server fa richieste verso questo host,
 * quindi non deve poter essere usato per raggiungere indirizzi pubblici o servizi sul PC stesso.
 */
export function normalizeHost(input: string): string | null {
  const s = input.trim().replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '');
  const m = s.match(/^([^:]+)(?::(\d{1,5}))?$/);
  if (!m) return null;
  const [, name, port] = m;
  if (port && (Number(port) < 1 || Number(port) > 65535)) return null;

  const ip = name.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ip) {
    const [a, b, c, d] = ip.slice(1).map(Number);
    if ([a, b, c, d].some((n) => n > 255)) return null;
    const privateNet = a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254);
    if (!privateNet) return null;
  } else {
    if (name.toLowerCase() === 'localhost') return null;
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.(local|lan|home|localdomain))?$/i.test(name)) return null;
  }
  return s.toLowerCase() === DEFAULT_HOST.toLowerCase() ? DEFAULT_HOST : s;
}

/** Verifica che all'indirizzo risponda davvero un Headrush Core. */
export async function probe(host: string, timeoutMs = 2500): Promise<{ rig: string } | null> {
  try {
    const res = await fetch(`http://${host}${RIG_PATH}`, {
      redirect: 'manual', // niente redirect verso altri host
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { PresetName?: unknown };
    return typeof json.PresetName === 'string' ? { rig: json.PresetName } : null;
  } catch {
    return null;
  }
}

export interface Found { host: string; rig: string }

/** Cerca i Core nelle sottoreti /24 delle interfacce di rete locali, più il nome mDNS di default. */
export async function scan(): Promise<Found[]> {
  const candidates = new Set<string>([DEFAULT_HOST]);
  for (const list of Object.values(networkInterfaces())) {
    for (const nic of list ?? []) {
      if (nic.family !== 'IPv4' || nic.internal || nic.address.startsWith('169.254.')) continue;
      const base = nic.address.split('.').slice(0, 3).join('.');
      for (let i = 1; i < 255; i++) candidates.add(`${base}.${i}`);
    }
  }

  const queue = [...candidates];
  const found: Found[] = [];
  const worker = async () => {
    for (let host = queue.pop(); host; host = queue.pop()) {
      const hit = await probe(host, host === DEFAULT_HOST ? 2000 : 700);
      if (hit) found.push({ host, rig: hit.rig });
    }
  };
  await Promise.all(Array.from({ length: 64 }, worker));
  return found.sort((a, b) => a.host.localeCompare(b.host));
}
