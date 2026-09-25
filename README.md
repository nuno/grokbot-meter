# GrokBot Meter

Menu bar meters for **Grok Bot** on macOS — weekly usage %, today, and reset timing. Tiny tray app; no Dock clutter.

> Unofficial companion. Not affiliated with, endorsed by, or a product of xAI, Cursor, or Apple. Uses **official Grok Bot meters only** — no invented caps or estimates.

## Early public beta

Unofficial **Grok Bot** menu-bar meters for macOS — early public beta for testers.

- Apple Silicon (arm64) build — ad-hoc signed, **not notarized**
- First launch needs one Gatekeeper approval — see [First launch](#first-launch-gatekeeper)
- Please file bugs and feedback via [Issues](https://github.com/nuno/grokbot-meter/issues)
- Not affiliated with xAI, Cursor, or Apple

**Install from Release DMG:** [github.com/nuno/grokbot-meter/releases](https://github.com/nuno/grokbot-meter/releases)


## Requirements

- macOS (Apple Silicon build target today; Intel not packaged yet)
- [Grok Bot](https://cursor.com) installed and signed in on this Mac
- Node.js 20+ (to build from source)

## Screenshots

Live meters from a local **0.2.7** build — weekly %, on-demand, today, and reset timing at a glance.

**Menu bar** — weekly % beside the tray icon, no Dock clutter.

![GrokBot Meter menu bar showing weekly usage percent](docs/screenshots/menubar2.png)

**Popup (light)** — weekly progress, on-demand, reset countdown, and today’s messages and agents.

![GrokBot Meter popup in light appearance](docs/screenshots/popup.png)

**Popup (dark)** — same meters in dark appearance.

![GrokBot Meter popup in dark appearance](docs/screenshots/popup-dark.png)

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

### First launch (Gatekeeper)

Release builds are ad-hoc signed but not notarized (no paid Apple Developer ID yet), so macOS asks you to approve the app once.

**macOS 15 Sequoia and later**

1. Drag **GrokBot Meter** to Applications and open it. macOS says it can't verify the developer — click **Done**.
2. Open **System Settings → Privacy & Security**, scroll to **Security**, and click **Open Anyway** next to "GrokBot Meter was blocked".
3. Confirm with **Open Anyway** and your password. Later launches open normally.

**macOS 14 Sonoma and earlier:** right-click **GrokBot Meter** → **Open** → **Open**.

If macOS still refuses (for example "is damaged and can't be opened"), clear the download quarantine flag and open it again:

```bash
xattr -dr com.apple.quarantine "/Applications/GrokBot Meter.app"
```

`npm run electron:build` ad-hoc signs the app in an `afterPack` hook (`scripts/after-pack-adhoc-sign.cjs`). See [docs/MAC-RELEASE.md](docs/MAC-RELEASE.md) for Developer ID and notarization notes.

## Usage

1. Launch GrokBot Meter — a small icon appears in the menu bar (no Dock icon).
2. Click for weekly %, today, sessions, and reset info.
3. Right-click the icon for About / Quit.

## What it accesses

GrokBot Meter has no server of its own and no telemetry. Everything below happens on your Mac or between your Mac and Cursor's servers — the same servers Grok Bot already talks to.

| What | Why |
| ---- | --- |
| `~/Library/Application Support/Grok Bot/sand-client-persistence/*.blob` (read-only) | Today's message count and recent agents |
| `~/Library/Application Support/Grok Bot/sand-secrets.json` (read-only) | Grok Bot's encrypted access token for your account |
| Keychain item **Grok Bot Safe Storage** (read-only) | The key Grok Bot uses to encrypt that token |
| `/Applications/Grok Bot.app/Contents/Info.plist` (read-only) | Grok Bot version shown in About |
| `api2.cursor.sh` — `GetSandUsageStatus`, `GetCurrentPeriodUsage`, `GetMe` | Weekly usage %, on-demand spend, account email |

It never writes to Grok Bot's files, never reads your refresh token, and never refreshes or changes your sign-in. When Grok Bot's access token expires, the meter shows **Open Grok Bot to refresh sign-in** until Grok Bot renews it.

These are undocumented Cursor endpoints, so they can change or break without notice.

### The Keychain prompt

When GrokBot Meter first loads your weekly usage after starting, macOS asks:

> **security** wants to use your confidential information stored in "Grok Bot Safe Storage" in your keychain.

"security" is macOS's built-in Keychain tool (`/usr/bin/security`), which GrokBot Meter uses to read the key.

- **Allow** (recommended): works for this session; you'll be asked again next launch.
- **Always Allow**: stops the prompts, but grants access to the `security` tool itself, which means any other program on your Mac could then read this key without asking. Only choose it if you're comfortable with that.
- **Deny**: the weekly meter shows **Keychain access denied** and won't ask again until you reopen the app. Today's activity still works.

## Development

```bash
npm run electron:dev    # Electron + hot reload
npm run electron:build  # ad-hoc signed arm64 dir + DMG + zip → releases/<version>/
npm run icons:gen       # regenerate packaging / tray icons
```

More detail: [docs/USER-GUIDE.md](docs/USER-GUIDE.md), [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Nuno Costa

## Security

See [SECURITY.md](SECURITY.md).
