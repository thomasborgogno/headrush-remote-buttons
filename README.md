# Headrush Remote Buttons

A touch remote for the **Headrush Core**: switch scenes and footswitch effects from a phone or tablet
(installable as a PWA). Scenes, latch (toggle) and hold (momentary) footswitches, both banks.

![status](https://img.shields.io/badge/status-experimental-orange)

> Unofficial project, not affiliated with inalCo / Headrush. It uses the same local HTTP API as the
> Core's own web editor (`http://<core>/`). That API is undocumented and may change with firmware updates.

## Why is a small server needed?

The Core's API does not send CORS headers and only speaks plain HTTP, so a web page hosted elsewhere
(e.g. GitHub Pages) cannot call it from the browser. This app therefore ships a tiny server that
serves the UI and forwards the few calls to the Core. It can run on any machine on the same network:
a PC, a Raspberry Pi, a NAS. Your phone only needs a browser.

```
phone / tablet (PWA)  --HTTP-->  Headrush Remote Buttons server  --HTTP-->  Headrush Core
```

## Quick start

Requires Node.js 20 or newer.

```bash
npm install
npm run build
npm start
```

The server prints the addresses to open from your phone, e.g. `http://192.168.1.240:8787`.
On first start it looks for the Core at `HeadRushCore.local`; if that doesn't work, the setup
screen opens by itself:

* type the Core's IP address, or
* tap **Search the network** to find Cores on your LAN automatically.

The address is saved (see *Configuration*) and can be changed any time with the ⚙ button.

## Docker / Raspberry Pi / NAS

```bash
docker compose up -d --build
```

`docker-compose.yml` uses host networking so the network search works (Linux only). On Docker Desktop
(Windows/macOS) use the `ports:` variant described in the file and type the Core's IP by hand.

## Using it

* **Bank A / Bank B / All**: Bank A = footswitches 6-10, Bank B = footswitches 1-5. The choice is remembered.
* **Scene** pedals: tap to select. Scenes with two states show **A/B**; tap the active scene again to toggle.
* **Latch** pedals: tap to turn on/off.
* **Hold** pedals: active while you keep your finger on them.
* Unassigned footswitches are shown as empty slots.

Not verified yet on real hardware: special operations such as Tap Tempo, Looper, MIDI Out, Ext Amp
and Drum Machine are driven like a normal latch/hold press. Reports welcome.

## Configuration

| Setting | How | Default |
|---|---|---|
| Core address | Setup screen (⚙), or `HEADRUSH_HOST` env var as initial value | `HeadRushCore.local` |
| Port | `PORT` env var | `8787` |
| Config directory | `HEADRUSH_CONFIG_DIR` env var | `~/.headrush-remote-buttons` (`/data` in Docker) |

Only local-network addresses are accepted for the Core (private IPv4 ranges, `.local`, `.lan`, `.home`).

## Security

There is no authentication: anyone who can reach the server can change scenes. Keep it on a trusted
home network and do not expose it to the internet. Requests that change anything are only accepted
from the app's own origin, so other websites open in your browser cannot control the Core.

## Development

```bash
npm run dev      # server with reload + Vite dev server (UI on :5173, proxied to :8787)
npx tsc --noEmit # type check
```

Stack: TypeScript, Svelte 5 + Vite (PWA via vite-plugin-pwa), Hono on Node.

## License

[MIT](LICENSE) © 2026 Thomas Borgogno
