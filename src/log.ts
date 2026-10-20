// Registro eventi in memoria (ultimi MAX): serve solo al rapporto diagnostico che l'utente può copiare.
// Non contiene nomi di rig o di footswitch e non viene mai inviato da nessuna parte.
const MAX = 200;
const entries: string[] = [];

export function log(kind: 'info' | 'write' | 'error', message: string) {
  entries.push(`${new Date().toISOString().slice(11, 23)} ${kind.padEnd(5)} ${message}`);
  if (entries.length > MAX) entries.shift();
}

export const getLog = () => [...entries];
