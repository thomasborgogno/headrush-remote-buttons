import { getDeviceInfo, type Snapshot } from './headrush';
import { getLog } from './log';

export const REPO = 'https://github.com/thomasborgogno/headrush-remote-buttons';
export const BUILD = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';

// GitHub rifiuta indirizzi più lunghi di circa 8000 caratteri: restiamo ben sotto.
const MAX_URL = 6500;

export interface Report {
  text: string; // quello che finisce nella segnalazione (e che l'utente può leggere in "Mostra log")
  issueUrl: string; // nuova segnalazione GitHub già compilata con il rapporto
  shortened: boolean;
}

/**
 * Rapporto diagnostico allegato alla segnalazione. NON include nomi di rig e di footswitch né l'indirizzo IP.
 * L'app non invia nulla: apre GitHub con il testo precompilato e l'utente decide se pubblicarlo.
 */
export async function buildReport(snap: Snapshot | null): Promise<Report> {
  let device = 'unknown';
  let firmware = 'unknown';
  let groups: Record<string, number> = {};
  let deviceError = '';
  try {
    const info = await getDeviceInfo();
    device = info.deviceName ?? device;
    firmware = info.appVersion ?? firmware;
    groups = info.keyGroups;
  } catch (e) {
    deviceError = e instanceof Error ? e.message : String(e);
  }

  const pedals = snap?.pedals ?? [];
  const count = (m: string) => pedals.filter((p) => p.mode === m).length;
  const orientation = innerHeight > innerWidth ? 'portrait' : 'landscape';

  const head = [
    `Device: ${device}`,
    `Firmware: ${firmware}`,
    `Pedals detected: ${snap ? `${pedals.length} (per bank ${snap.perBank})` : 'unknown'}`,
    `Modes: scene=${count('scene')} latch=${count('latch')} hold=${count('hold')} empty=${count('empty')}`,
    `App build: ${BUILD}`,
    `Time: ${new Date().toISOString()}`,
    `Browser: ${navigator.userAgent}`,
    `Screen: ${screen.width}x${screen.height} @${devicePixelRatio}x, viewport ${innerWidth}x${innerHeight} (${orientation})`,
    `Language: ${navigator.language}`,
    `Page: ${location.protocol}//<host>${location.port ? ':' + location.port : ''}${location.pathname}`,
    ...(deviceError ? [`Device info error: ${deviceError}`] : []),
  ];
  const pedalLines = pedals.map(
    (p) => `${p.index} ${p.bank} ${p.mode} ${p.module} op=${p.operation || '-'} states=${p.states} on=${p.on}`,
  );
  const groupLine = Object.entries(groups).map(([g, n]) => `${g} x${n}`).join(', ');
  const events = getLog();

  // Dal rapporto completo al più corto, finché l'indirizzo sta nel limite di GitHub
  const levels = [
    { events: 200, groups: true },
    { events: 40, groups: true },
    { events: 10, groups: true },
    { events: 10, groups: false },
    { events: 0, groups: false },
  ];
  let chosen: Report | undefined;
  levels.forEach((lv, i) => {
    if (chosen) return;
    const shortened = i > 0;
    const text = [
      ...head,
      '',
      'Pedals (index bank mode module; rig and footswitch names omitted):',
      ...pedalLines,
      ...(lv.groups && groupLine ? ['', 'FootSwitch property groups (digits replaced by #):', groupLine] : []),
      '',
      'Recent events (newest last):',
      ...(lv.events ? events.slice(-lv.events) : ['(omitted)']),
      ...(shortened ? ['', '(log shortened to fit the GitHub link)'] : []),
    ].join('\n');
    const body = `<!-- Describe what you tried and what happened above this line -->\n\n\`\`\`\n${text}\n\`\`\`\n`;
    const issueUrl = `${REPO}/issues/new?${new URLSearchParams({ body }).toString()}`;
    if (issueUrl.length <= MAX_URL || i === levels.length - 1) chosen = { text, issueUrl, shortened };
  });
  return chosen!;
}
