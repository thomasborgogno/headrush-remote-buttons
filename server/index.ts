import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { CONFIG_FILE, DEFAULT_HOST, loadHost, saveHost } from './config.ts';
import { normalizeHost, probe, scan } from './core.ts';

const PORT = Number(process.env.PORT ?? 8787);
const TIMEOUT_MS = 3000;

let coreHost = normalizeHost(loadHost()) ?? DEFAULT_HOST;

const app = new Hono();

// Difesa da richieste cross-site (una pagina web qualsiasi non deve poter comandare il pedale
// né cambiare indirizzo): le richieste che modificano qualcosa devono arrivare da questa stessa origine.
app.use('/api/*', async (c, next) => {
  if (c.req.method !== 'GET') {
    const origin = c.req.header('origin');
    if (origin && new URL(origin).host !== c.req.header('host')) return c.json({ error: 'Forbidden' }, 403);
  }
  await next();
});

// --- Impostazioni / wizard ---------------------------------------------------------------

app.get('/api/setup', async (c) => {
  const hit = await probe(coreHost, 1500);
  return c.json({ host: coreHost, reachable: !!hit, rig: hit?.rig ?? null });
});

app.post('/api/setup/test', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const host = normalizeHost(String(body.host ?? ''));
  if (!host) return c.json({ ok: false, error: 'invalid' }, 400);
  const hit = await probe(host);
  return hit ? c.json({ ok: true, host, rig: hit.rig }) : c.json({ ok: false, error: 'unreachable', host }, 200);
});

app.post('/api/setup', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const host = normalizeHost(String(body.host ?? ''));
  if (!host) return c.json({ ok: false, error: 'invalid' }, 400);
  const hit = await probe(host);
  if (!hit) return c.json({ ok: false, error: 'unreachable', host });
  coreHost = host;
  saveHost(host);
  return c.json({ ok: true, host, rig: hit.rig });
});

app.get('/api/setup/scan', async (c) => c.json({ found: await scan() }));

// --- Proxy verso il Core (solo lettura/scrittura delle proprietà) -------------------------

app.all('/api/v1/object-properties/*', async (c) => {
  if (!['GET', 'PUT'].includes(c.req.method)) return c.text('Method Not Allowed', 405);
  const url = `http://${coreHost}${new URL(c.req.url).pathname}`;
  try {
    const res = await fetch(url, {
      method: c.req.method,
      headers: { 'Content-Type': 'application/json' },
      body: c.req.method === 'PUT' ? await c.req.text() : undefined,
      redirect: 'manual',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return new Response(res.body, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('content-type') ?? 'application/json', 'Cache-Control': 'no-store' },
    });
  } catch {
    return c.json({ error: 'Core non raggiungibile', core: coreHost }, 502);
  }
});

app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

if (existsSync('dist')) {
  app.use('/*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' }, () => {
  console.log(`Headrush Remote Buttons -> Core: ${coreHost}  (config: ${CONFIG_FILE})`);
  console.log(`Apri dal telefono / Open from your phone:`);
  for (const list of Object.values(networkInterfaces()))
    for (const nic of list ?? [])
      if (nic.family === 'IPv4' && !nic.internal) console.log(`  http://${nic.address}:${PORT}`);
});
