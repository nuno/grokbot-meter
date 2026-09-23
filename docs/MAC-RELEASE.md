# GrokBar Mac release

## What you can do without Apple Developer Program

Your account is a **free Personal Team** (`YOUR_TEAM_ID`, Nuno Costa). That is enough for:

```bash
npm run electron:build
```

This produces an **unsigned** arm64 `.app` under `dist/mac-arm64` and versioned `.dmg` / `.zip` artifacts under `releases/<version>/` for **your Mac only**.

First open on macOS:
1. Open `releases/<version>/GrokBar-<version>-arm64.dmg` and drag GrokBar to Applications (or run from `dist/mac-arm64`).
2. If Gatekeeper blocks it: right-click the app → **Open** → **Open**.

Do **not** use any other person’s Developer ID on this machine.

Before every release, bump the `version` in `package.json`. The build scripts use that version to move the DMG, zip, and blockmaps from `dist/` into `releases/<version>/`; `dist/mac-arm64` remains build staging.

## What requires paid Apple Developer Program ($99/yr)

- `Developer ID Application` certificate for **Nuno Costa**
- Notarization + staple
- Sharing a DMG that opens cleanly for other people (Gatekeeper)

When enrolled, use:

```bash
npm run electron:build:release
```

with identity `Developer ID Application: Nuno Costa (YOUR_TEAM_ID)` and notary credentials configured.


## App / tray icons

Canonical mark: `src/components/icons/GrokMark2Icon.tsx` (header + About).

Regenerate packaging assets (icns, png sizes, tray template):

```bash
npm run icons:gen
```

Do not reintroduce `app-icon-source.png`, purple chart packs, or outline/antenna Bot marks.
