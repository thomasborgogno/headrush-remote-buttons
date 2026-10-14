# Headrush Remote Buttons

A touch remote for Headrush pedalboards: switch scenes and footswitch effects from a phone or tablet.
Scenes (with A/B states), latch (toggle) and hold (momentary) footswitches, both banks.
Nothing to install: it runs in your browser, started with a bookmark.

![status](https://img.shields.io/badge/status-experimental-orange)

> **Tested only on the Headrush Core.** It may also work with other models that have the same web
> editor (Flex Prime, Pedalboard), but that has not been tried. Reports welcome.
>
> Unofficial project, not affiliated with Headrush / inalCo. It uses the same local HTTP API as the
> device's own web editor. That API is undocumented and may change with firmware updates.

## How it works

The device's API sends no CORS headers and only speaks plain HTTP, so a normal web page (e.g. on GitHub
Pages) cannot call it. The workaround: the device's own page allows scripts from any HTTPS address, so a
bookmark can load this app **into that page**, where its API calls are same-origin.

1. Open the project's page (GitHub Pages) and create the bookmark.
2. Open your Headrush's address in your browser (phone and Headrush on the same network) and run the bookmark.

The app replaces the official editor on screen (the editor is only hidden). Reload the page to get it back.
The page can't search your network for the IP address (browsers don't allow a secure page to scan it):
look in the pedalboard's network settings or in your router's list of connected devices.

## Using it

* **Bank A / Bank B / All**: Bank A = footswitches 6-10, Bank B = footswitches 1-5. The choice is remembered.
* **Scene** pedals: tap to select. Scenes with two states show **A/B**; tap the active scene again to toggle.
* **Latch** pedals: tap to turn on/off.
* **Hold** pedals: active while you keep your finger on them.
* Unassigned footswitches are shown as empty slots.

Not verified yet on real hardware: special operations such as Tap Tempo, Looper, MIDI Out, Ext Amp
and Drum Machine are driven like a normal latch/hold press.

## Security

The script runs inside the device's page with the same powers as the official editor.

* The script is loaded from the GitHub Pages site every time you run the bookmark, so updates arrive
  automatically. It also means that whoever controls that site controls what runs on your Headrush:
  use the official page, or deploy your own copy (fork the repository and enable Pages).
* The app can only write scene and footswitch state (`SceneActive`, `SceneState`, `FootSwitchOn`,
  `FootswitchHeld`, footswitches 1-10); anything else is rejected before the request is made
  (`assertWritable` in `src/headrush.ts`). It never saves, renames or deletes rigs.
* Nothing is sent anywhere but to your Headrush. Only use bookmarklets from pages you trust.
* The device has no password: anyone on your network can already control it.

## Limits

* Two steps every time: open the Headrush, run the bookmark. It can't be installed as an app
  (the device's page is plain HTTP).
* On iPhone/iPad Safari the bookmark runs from the bookmarks list. Chrome on Android may do nothing when
  you tap a `javascript:` bookmark and strips that prefix when you paste: open the Headrush page, **type**
  `javascript:` in the address bar and paste the script right after it (the page has a "Copy script only"
  button). Firefox runs bookmarklets from the bookmarks menu.
* A firmware update that tightens the device's content security policy would stop it from loading.

## Development

```bash
npm install
npm run typecheck
npm run build:pages   # builds pages-dist/ (remote.js + instructions page)
```

`.github/workflows/pages.yml` deploys `pages-dist/` to GitHub Pages on every push to `main`
(Settings → Pages → Source: GitHub Actions).

Stack: TypeScript, Svelte 5, Vite (single-file IIFE bundle).

## License

[MIT](LICENSE) © 2026 Thomas Borgogno
