# GrokBar

Menu bar meters for **Grok Bot** on macOS — weekly usage %, today, and reset timing. Tiny tray app; no Dock clutter.

> Unofficial companion. Not affiliated with, endorsed by, or a product of xAI, Cursor, or Apple. Uses **official Grok Bot meters only** — no invented caps or estimates.

## Requirements

- macOS (Apple Silicon build target today; Intel not packaged yet)
- [Grok Bot](https://cursor.com) installed and signed in on this Mac
- Node.js 20+ (to build from source)

## Screenshots

Live meters from a local **0.2.3** build — weekly %, today, and reset timing at a glance.

<p align="center">
  <strong>Menu bar</strong><br>
  <img src="docs/screenshots/menubar.png" alt="GrokBar menu bar showing weekly usage percent" width="280"><br>
  <sub>Weekly % beside the tray icon — no Dock clutter.</sub>
</p>

<p align="center">
  <strong>Popup</strong><br>
  <img src="docs/screenshots/popup.png" alt="GrokBar popup with weekly meter, today messages and agents, and reset countdown" width="400"><br>
  <sub>Weekly progress and reset countdown, plus today’s messages and agents.</sub>
</p>

Captured without using Refresh for shots. See [docs/screenshots/README.md](docs/screenshots/README.md).

## Install from source

```bash
git clone <your-fork-or-repo-url> grokbar
cd grokbar
npm install
npm run electron:build
```

Artifacts:

| Output | Path |
| ------ | ---- |
| Unpacked `.app` | `dist/mac-arm64/GrokBar.app` |
| Versioned DMG / zip | `releases/<version>/` (e.g. `releases/0.2.3/`) |

Drag **GrokBar** to Applications (from the DMG or from `dist/mac-arm64`).

### Unsigned builds & Gatekeeper

`npm run electron:build` produces an **unsigned** app (`CSC_IDENTITY_AUTO_DISCOVERY=false`). Until the DMG is signed and notarized:

1. Right-click **GrokBar** → **Open** → **Open** (first launch).
2. Or: System Settings → Privacy & Security → allow the blocked app.

See [docs/MAC-RELEASE.md](docs/MAC-RELEASE.md) for Personal Team limits, paid Developer ID, and notarization notes.

## Usage

1. Launch GrokBar — a small icon appears in the menu bar (no Dock icon).
2. Click for weekly %, today, sessions, and reset info.
3. Right-click the icon for About / Quit.

Data comes from local Grok Bot state on your Mac (and official account meters when signed in). Your files stay on your machine.

## Development

```bash
npm run electron:dev    # Electron + hot reload
npm run electron:build  # unsigned arm64 dir + DMG + zip → releases/<version>/
npm run icons:gen       # regenerate packaging / tray icons
```

Optional perf harness (real env, no mocks):

```bash
npm run perf:baseline
npm run perf:electron
npm run perf:compare    # → perf-results/report.md
```

More detail: [docs/USER-GUIDE.md](docs/USER-GUIDE.md), [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Nuno Costa

## Security

See [SECURITY.md](SECURITY.md).
