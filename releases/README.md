# Packaged releases

Each version gets its own folder: `releases/<version>/`. Installers and archives are ignored by Git because they are large binaries.

| Platform | Script | Artifacts |
| -------- | ------ | --------- |
| macOS | `npm run electron:build` or `npm run electron:build:release` | `.dmg`, `.zip`, `.blockmap` |
| Windows | `npm run dist:win` | NSIS `.exe`, portable `.zip`, `.blockmap` |

Both scripts build into `dist/` and then move the versioned artifacts here. Unpacked staging stays in `dist/mac-arm64` or `dist/win-unpacked`.
