# GrokBot Meter Windows packaging

Unsigned x64 proof-of-concept. `package.json` `version` stays at the current Mac release (**0.3.1**). This does not change `npm run electron:build` or `npm run electron:build:release`.

## Build

Node.js 20+ and a checkout of this branch:

```bash
npm ci
npm run dist:win
```

`dist:win` typechecks the renderer, runs `electron-vite build`, then `electron-builder --win --x64`. The `build.win` targets are:

- **nsis** — installer
- **zip** — portable archive of the unpacked app

Code-signing auto-discovery is off (`scripts/electron-builder-unsigned.mjs` sets `CSC_IDENTITY_AUTO_DISCOVERY=false`), so a cert in the Windows store is not picked up. The script uses a Node spawn so the same command works in Windows cmd and in a Unix shell.

Artifacts are moved from `dist/` into `releases/<version>/` by `scripts/organize-release-artifacts.mjs` (same folder rule as the Mac DMG and zip). For 0.3.1:

| File | What it is |
| ---- | ---------- |
| `releases/0.3.1/GrokBot-Meter-0.3.1-x64.exe` | NSIS installer |
| `releases/0.3.1/GrokBot-Meter-0.3.1-x64.zip` | Portable zip. Unzip and run `GrokBot Meter.exe` |
| `releases/0.3.1/GrokBot-Meter-0.3.1-x64.exe.blockmap` | NSIS differential-update blockmap |

Unpacked staging stays in `dist/win-unpacked`. Those binaries are gitignored.

The installer is one-click, per-user, and does not ask for an admin password. It is not Microsoft Store and not Authenticode-signed. Windows SmartScreen will warn on first launch. Choose **More info** → **Run anyway** for this PoC, or run the exe inside the zip the same way.

## Where to run it

**Windows loaner (preferred).** Use a separate Windows user so Node and Electron stay off the daily profile. Install Git and Node LTS only. Clone this branch, run the commands above, and copy `releases/0.3.1/` back. Do not copy a Mac signing identity or `.env`.

**Linux or macOS.** The same `npm run dist:win` cross-compiles the Windows targets. electron-builder 26 edits the exe resources and runs NSIS without Wine. If NSIS fails on a given machine, build on the loaner with the same script. There is no Windows self-hosted runner for this repo; a Linux cloud agent can produce the `.exe` and `.zip`, but the tray itself still needs the loaner to click through.

## What this package does not include

- Authenticode signing or the Microsoft Store
- An arm64 Windows build (x64 only, same single-arch choice as the Mac arm64 DMG)
- README install notes for Windows users (later step)
- A version bump
