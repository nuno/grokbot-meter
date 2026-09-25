# GrokBot Meter Mac release

## What you can do without Apple Developer Program

A free **Personal Team** Apple ID (Developer → Account) is enough for:

```bash
npm run electron:build
```

This produces an **ad-hoc signed** (not notarized) arm64 `.app` under `dist/mac-arm64` and versioned `.dmg` / `.zip` artifacts under `releases/<version>/`.

The `afterPack` hook (`scripts/after-pack-adhoc-sign.cjs`) re-signs the whole bundle with `codesign --force --deep --sign -` and runs a strict verify, so the build fails if the signature is broken. Without it, the bundle keeps Electron's linker-only signature and quarantined downloads are reported as "damaged".

Before publishing, check the artifact users will download (not just `dist/mac-arm64`):

```bash
ditto -x -k releases/<version>/GrokBot-Meter-<version>-arm64.zip /tmp/gbm-check
codesign --verify --deep --strict --verbose=2 "/tmp/gbm-check/GrokBot Meter.app"   # must print "valid on disk"
spctl --assess --type execute -vv "/tmp/gbm-check/GrokBot Meter.app"               # "rejected" is expected (not notarized)
```

First open on macOS: see [First launch (Gatekeeper)](../README.md#first-launch-gatekeeper) in the README.

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

with identity `Developer ID Application: Your Name (YOUR_TEAM_ID)` and notary credentials configured.


## App / tray icons

Canonical mark: `src/components/icons/GrokMark2Icon.tsx` (header + About).

Regenerate packaging assets (icns, png sizes, tray template):

```bash
npm run icons:gen
```

Do not reintroduce `app-icon-source.png`, purple chart packs, or outline/antenna Bot marks.
