# GrokBot Meter

Menu bar meters for **Grok Bot** on macOS — weekly usage %, today, and reset timing. Tiny tray app; no Dock clutter.

> Unofficial companion. Not affiliated with, endorsed by, or a product of xAI, Cursor, or Apple. Uses **official Grok Bot meters only** — no invented caps or estimates.

## Early public beta

Unofficial **Grok Bot** menu-bar meters for macOS — early public beta for testers.

- **Unsigned** Apple Silicon (arm64) build — not notarized
- First launch: right-click the app → **Open** → **Open** (Gatekeeper)
- Please file bugs and feedback via [Issues](https://github.com/nuno/grokbot-meter/issues)
- Not affiliated with xAI, Cursor, or Apple

**Install from Release DMG:** [github.com/nuno/grokbot-meter/releases](https://github.com/nuno/grokbot-meter/releases)


## Requirements

- macOS (Apple Silicon build target today; Intel not packaged yet)
- [Grok Bot](https://cursor.com) installed and signed in on this Mac
- Node.js 20+ (to build from source)

## Screenshots

Live meters from a local **0.2.5** build — weekly %, today, and reset timing at a glance.

**Menu bar** — weekly % beside the tray icon, no Dock clutter.

![GrokBot Meter menu bar showing weekly usage percent](docs/screenshots/menubar.png)

**Popup** — weekly progress, reset countdown, and today’s messages and agents.

![GrokBot Meter popup with weekly meter, today messages and agents, and reset countdown](docs/screenshots/popup.png)

Captured without using Refresh for shots. See [docs/screenshots/README.md](docs/screenshots/README.md).

## Install from source

```bash
git clone https://github.com/nuno/grokbot-meter.git grokbot-meter
cd grokbot-meter
npm install
npm run electron:build
```

Artifacts:

| Output | Path |
| ------ | ---- |
| Unpacked `.app` | `dist/mac-arm64/GrokBot Meter.app` |
| Versioned DMG / zip | `releases/<version>/` (e.g. `releases/0.2.5/`) |

Drag **GrokBot Meter** to Applications (from the DMG or from `dist/mac-arm64`).

### Unsigned builds & Gatekeeper

`npm run electron:build` produces an **unsigned** app (`CSC_IDENTITY_AUTO_DISCOVERY=false`). Until the DMG is signed and notarized:

1. Right-click **GrokBot Meter** → **Open** → **Open** (first launch).
2. Or: System Settings → Privacy & Security → allow the blocked app.

See [docs/MAC-RELEASE.md](docs/MAC-RELEASE.md) for Personal Team limits, paid Developer ID, and notarization notes.

## Usage

1. Launch GrokBot Meter — a small icon appears in the menu bar (no Dock icon).
2. Click for weekly %, today, sessions, and reset info.
3. Right-click the icon for About / Quit.

Data comes from local Grok Bot state on your Mac (and official account meters when signed in). Your files stay on your machine.

## Development

```bash
npm run electron:dev    # Electron + hot reload
npm run electron:build  # unsigned arm64 dir + DMG + zip → releases/<version>/
npm run icons:gen       # regenerate packaging / tray icons
```

More detail: [docs/USER-GUIDE.md](docs/USER-GUIDE.md), [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Nuno Costa

## Security

See [SECURITY.md](SECURITY.md).
