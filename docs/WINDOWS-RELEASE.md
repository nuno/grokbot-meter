# GrokBot Meter Windows packaging

Unsigned x64 build. `package.json` `version` is **0.4.0**, the same version as the Mac release. This does not change `npm run electron:build` or `npm run electron:build:release`.

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

Artifacts are moved from `dist/` into `releases/<version>/` by `scripts/organize-release-artifacts.mjs` (same folder rule as the Mac DMG and zip). For 0.4.0:

| File | What it is |
| ---- | ---------- |
| `releases/0.4.0/GrokBot-Meter-0.4.0-x64.exe` | NSIS installer |
| `releases/0.4.0/GrokBot-Meter-0.4.0-x64.zip` | Portable zip. Unzip and run `GrokBot Meter.exe` |
| `releases/0.4.0/GrokBot-Meter-0.4.0-x64.exe.blockmap` | NSIS differential-update blockmap |

Unpacked staging stays in `dist/win-unpacked`. Those binaries are gitignored.

The installer is one-click, per-user, and does not ask for an admin password. It is not Microsoft Store and not Authenticode-signed. Windows SmartScreen will warn on first launch. Choose **More info** → **Run anyway** for this PoC, or run the exe inside the zip the same way.

## Where to run it

**Windows loaner (preferred).** Use a separate Windows user so Node and Electron stay off the daily profile. Install Git and Node LTS only. Clone this branch, run the commands above, and copy `releases/0.4.0/` back. Do not copy a Mac signing identity or `.env`.

**Linux or macOS.** The same `npm run dist:win` cross-compiles the Windows targets. electron-builder edits exe resources in-process and compiles NSIS with a native `makensis`. It then launches the installer once to embed the uninstaller. That stub is a 32-bit PE, so `wine` must be on `PATH` and able to run it. On Ubuntu:

```bash
sudo dpkg --add-architecture i386
sudo apt-get update
sudo apt-get install -y wine wine64 wine32:i386
```

Do not pin `build.toolsets.wine` to electron-builder's Wine 11 bundle (`1.0.1`). That archive has no runnable prefix (`kernel32.dll` is missing), so the uninstaller step fails. On the loaner the installer runs natively and Wine is not used. There is no Windows self-hosted runner for this repo. A Linux machine with Wine can produce the `.exe` and `.zip`, but the tray itself still needs the loaner to click through.

Open at login is not written by the installer. After the app is running, Settings → **Open at login** stores a per-user startup entry for that Windows user.

## What this package does not include

- Authenticode signing or the Microsoft Store
- An arm64 Windows build (x64 only, same single-arch choice as the Mac arm64 DMG)
- README install notes for Windows users (later step)
- A version bump
