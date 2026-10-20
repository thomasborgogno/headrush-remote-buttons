# Headrush Remote Buttons

A touch remote for Headrush pedalboards: switch scenes and footswitch effects from a phone or tablet.
Scenes (with A/B states), latch (toggle) and hold (momentary) footswitches, both banks.
Nothing to install: it runs in your browser, started with a bookmark.

![status](https://img.shields.io/badge/status-experimental-orange)
[![Donate with PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal&logoColor=white)](https://paypal.me/thomasborgogno)

> **Tested only on the Headrush Core.** It may also work with other models that have the same web
> editor (Prime, Flex Prime), but that has not been tried. Reports welcome.
>
> Unofficial project, not affiliated with Headrush / inalCo. It uses the same local HTTP API as the
> device's own web editor. That API is undocumented and may change with firmware updates.

## Before you start

On your Headrush, open **Global Settings** and set **Headrush Remote** to **On**. Make sure Wi-Fi is on
and that your phone and the Headrush are on the same network.

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

* **Bank A / Bank B / All**: The footswitches are split in two halves: Bank B = the first half, Bank A = the second (Core: B = 1-5, A = 6-10). The number of footswitches is detected from the device. The choice is remembered.
* **Rig menu (☰, top left)** lists the rigs of the current setlist, each with its color: tap one to load it. The **‹ ›** arrows next to the rig
  name go to the previous/next rig (wrapping around). If the current rig has unsaved changes on the Headrush, the app asks first.
* **Scene** pedals: tap to select. Scenes with two states show **A/B**; tap the active scene again to toggle.
* **Latch** pedals: tap to turn on/off.
* **Hold** pedals: active while you keep your finger on them.
* Unassigned footswitches are shown as empty slots.

Not verified yet on real hardware: special operations such as Tap Tempo, Looper, MIDI Out, Ext Amp
and Drum Machine are driven like a normal latch/hold press.

## Security

The script runs inside the device's page with the same powers as the official editor.

* The app can only write scene and footswitch state (`SceneActive`, `SceneState`, `FootSwitchOn`,
  `FootswitchHeld`, footswitches 1-32); anything else is rejected before the request is made
  (`assertWritable` in `src/headrush.ts`). The only other thing it can do is load a rig of the current
  setlist (`loadRigConfirm`, checked by `assertMethodAllowed`): every other method call is rejected.
  It never saves, renames or deletes rigs.
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

## Feedback and diagnostics

Tap the **?** button next to the connection dot:

* **Contact on GitHub** opens a new issue with a technical log already filled in: device model and
  firmware, the number and type of footswitches detected, the structure of the device's footswitch
  properties and the recent events. It is extremely useful to add support for other models (Prime,
  Flex Prime...). If the log is too long for a GitHub link, the oldest events are dropped first.
* **Show log** lets you read exactly what will be attached. It does **not** include rig or footswitch
  names or your IP address. The app sends nothing by itself: it only opens GitHub, and you decide
  whether to post the issue.
* **Back to the official editor** reloads the page.

## Support

If this project is useful to you, you can support it with a donation:

[![Donate with PayPal](https://img.shields.io/badge/Donate-PayPal-00457C?logo=paypal&logoColor=white)](https://paypal.me/thomasborgogno)

## License

[MIT](LICENSE) © 2026 Thomas Borgogno
