export interface SetupInfo { host: string; reachable: boolean; rig: string | null }
export interface Found { host: string; rig: string }
export type SetupResult =
  | { ok: true; host: string; rig: string }
  | { ok: false; error: 'invalid' | 'unreachable' };

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  return res.json() as Promise<T>; // anche le risposte 400 hanno un corpo JSON utile
}

const post = (body: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

// L'ultimo Core raggiunto resta anche nel browser: se la configurazione sul server sparisce
// (nuovo volume Docker, altra cartella di config) l'app la ripristina senza riaprire il wizard.
const KEY = 'coreHost';
export const rememberedHost = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
export const rememberHost = (host: string) => {
  try { localStorage.setItem(KEY, host); } catch {}
};

export const getSetup = () => json<SetupInfo>('/api/setup');
export async function saveHost(host: string) {
  const result = await json<SetupResult>('/api/setup', post({ host }));
  if (result.ok) rememberHost(result.host);
  return result;
}
export const scanNetwork = async () => (await json<{ found: Found[] }>('/api/setup/scan')).found;
