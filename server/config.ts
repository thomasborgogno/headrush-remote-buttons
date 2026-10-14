import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEFAULT_HOST = 'HeadRushCore.local';

const DIR = process.env.HEADRUSH_CONFIG_DIR ?? join(homedir(), '.headrush-remote-buttons');
const FILE = join(DIR, 'config.json');

/** Host salvato dal wizard; altrimenti variabile d'ambiente; altrimenti il default. */
export function loadHost(): string {
  try {
    const host = JSON.parse(readFileSync(FILE, 'utf8')).host;
    if (typeof host === 'string' && host) return host;
  } catch {
    // nessuna configurazione salvata
  }
  return process.env.HEADRUSH_HOST ?? process.env.HEADRUSH_URL ?? DEFAULT_HOST;
}

export function saveHost(host: string) {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify({ host }, null, 2));
}

export const CONFIG_FILE = FILE;
