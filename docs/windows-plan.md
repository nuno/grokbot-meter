# Windows v1 plan

Agreed 2026-10-01. Documentation only. This file does not change the app, `package.json`, Electron config, or release scripts.

## Goal

A Windows system-tray app with the same official weekly and today meters as Mac.

Mac stays the primary platform. Windows is additive. The Windows build should feel as Windows-native as the Mac build feels Mac-native.

## Decisions

Locked 2026-10-01.

- **Tray label.** Show the weekly **% in the tray text**, the same idea as the Mac menu-bar title.
- **Autostart / Open at login.** Later. Not v1. (On Mac this is a real setting; the current main process already reports login-item support as off on non-darwin.)
- **Dev/test machine.** A dedicated Windows loaner (secondary Windows PC) for build and tray QA. A separate Windows user is recommended.
- **Native Windows UX.** Notification-area tray, Windows 11 Mica/Acrylic where Electron allows it, Segoe UI, system light/dark, a right-click tray menu (Quit / Open), and DPI-aware popup anchoring. This is a Windows app, not a Mac skin running on Windows.

## Non-goals for v1

- Perfect Mac visual parity (Coffee materials, menu-bar chrome).
- Code signing and the Microsoft Store.
- Linux. The existing `linux` electron-builder stub is out of scope.
- Extra Cursor dashboard APIs, or inferred dollar caps. Product rule: official `GetSandUsageStatus` and the official meters only.

## Architecture sketch

Intended shape for later PRs. Not implemented here.

- **UI.** Share the React popup where it can be shared. Theme tokens must work without macOS vibrancy.
- **Main process.** Split platform code into `mac/` and `win/` for the tray, window position, and quit. Mac behavior stays as it is. Today the tray title (`tray.setTitle`) and the login-item helpers are darwin-only inside `electron/main.ts`.
- **Packaging.** `npm run dist:win` runs electron-builder `win` for an NSIS installer and a portable zip, both under `releases/<version>/`, same folder rule as the Mac DMG and zip. See [WINDOWS-RELEASE.md](WINDOWS-RELEASE.md). Unsigned. The version stays on the current Mac release until a Windows release is cut.
- **Data.** Keep the same auth and weekly IPC path (`GetSandUsageStatus`, `GetCurrentPeriodUsage`, `GetMe`). Today meters stay local and read-only.

### Today and secret paths (Mac, current)

Today’s message and agent counts come from local blobs. `electron/grokSource.ts` checks, in order:

- `~/Library/Application Support/Grok Bot/sand-client-persistence`
- `~/.config/Grok Bot/sand-client-persistence`
- `~/.grokbot`

Weekly auth reads `sand-secrets.json` from the Grok Bot support dir, `~/.config/Grok Bot`, `~/.grokbot`, and the persistence dirs (`electron/weekly.ts`). The safe-storage key is the macOS Keychain item **Grok Bot Safe Storage**, via `/usr/bin/security`. Off darwin, that read returns missing.

Windows paths for those blobs and secrets are not known yet. See [Open follow-ups](#open-follow-ups). Do not guess `%APPDATA%` (or any other) locations in code until they are confirmed on a signed-in Windows Grok Bot install.

## PR sequence

Future work. Do not implement from this doc.

1. This docs PR.
2. Platform seams, with Mac behavior unchanged.
3. Windows tray proof of concept.
4. `dist:win` and artifacts under `releases/`. Script and loaner steps: [WINDOWS-RELEASE.md](WINDOWS-RELEASE.md).
5. README Windows install notes.
6. QA checklist: tray, themes, weekly failure UX, spend-safe behavior, reset countdown.

## Versioning

Do not bump `package.json` until the first shippable Windows build. Same rule as Mac: the version moves when a release is actually cut, not for a plan or a prototype.

## Loaner Windows PC workflow

Use a dedicated Windows loaner for build and tray QA. Keep that work off the machine’s daily user account.

1. Prefer a separate Windows user (`GrokBotDev`) so Node and Electron stay off the daily profile.
2. Install only Git and Node LTS. Add Visual Studio Build Tools only if a native module actually needs them.
3. Clone the public repo or pull the branch. No Apple secrets. Do not copy the daily user profile.
4. Build and run under that user. Copy `releases/` artifacts back to the Mac or attach them to a GitHub Release.
5. Today meters need Grok Bot signed in on that Windows machine when Today is under test.
6. Alternative: keep development on the Mac and add a CI Windows builder later. Use the loaner for manual tray QA of the installers.

## Open follow-ups

Unresolved. Do not treat a guess as a decision.

- CI Windows runner versus building only on a loaner Windows PC (local Windows machine).
- Exact Grok Bot Windows data paths for Today (blobs and `sand-secrets.json`).
