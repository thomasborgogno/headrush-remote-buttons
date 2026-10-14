# Headrush Remote Buttons

A touch remote for the **Headrush Core**: switch scenes and footswitch effects from a phone or tablet.
Scenes, latch (toggle) and hold (momentary) footswitches, both banks.

Two ways to use it:

| | Nothing to install (bookmarklet) | Server version |
|---|---|---|
| Needs | a browser | Node.js 20+ or Docker, on a PC / Raspberry Pi / NAS |
| Start | open the Core, run the bookmark | open the server's address |
| Installable app (PWA) | no | yes |
| Core address | the page you opened | wizard + network search |

![status](https://img.shields.io/badge/status-experimental-orange)

> Unofficial project, not affiliated with inalCo / Headrush. It uses the same local HTTP API as the
> Core's own web editor (`http://<core>/`). That API is undocumented and may change with firmware updates.

## Nothing to install: the bookmarklet

The Core's API sends no CORS headers and only speaks plain HTTP, so a normal web page (e.g. on GitHub
Pages) cannot call it. The workaround: the Core's own page allows scripts from any HTTPS address, so a
bookmark can load this app **into the Core's page**, where its API calls are same-origin.

1. Open the project's page (GitHub Pages, deployed by `.github/workflows/pages.yml`) and create the bookmark.
2. Open the Core's address in your browser and run the bookmark.

The app replaces the official editor on screen (the editor is only hidden). Reload the page to get it back.

**Security.** The script runs inside the Core's page with the same powers as the official editor.
* The bookmark pins the exact file with an SRI hash: if the hosted file changes, the browser refuses
  to run it. After an update you must create the bookmark again from the page.
* The app can only write scene and footswitch state (`SceneActive`, `SceneState`, `FootSwitchOn`,
  `FootswitchHeld`, footswitches 1-10); anything else is rejected before the request is made
  (`assertWritable` in `src/core.ts`). It never saves, renames or deletes rigs.
* Nothing is sent anywhere but to your Core. Only use bookmarklets from pages you trust.

Limits: two steps every time (open the Core, run the bookmark), no installable app, and a firmware
update that tightens the Core's content security policy would stop it from loading. On iPhone/iPad
Safari it works from the bookmarks list; on Android Chrome you type the bookmark's name in the address
bar; Firefox runs it from the bookmarks menu.

```bash
npm run build:pages   # builds pages-dist/ (bundle + instructions page with the SRI hash)
```

## Server version

For an installable app. A tiny server serves the UI and forwards the few calls to the Core. It can run
on any machine on the same network: a PC, a Raspberry Pi, a NAS. Your phone only needs a browser.

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
