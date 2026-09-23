# Packaged releases

Each version gets its own folder: `releases/<version>/`. The DMG, zip, and blockmap files are intentionally ignored by Git because they are large binaries.

`npm run electron:build` and `npm run electron:build:release` build into `dist/` and then move the versioned artifacts here. The unpacked app remains in `dist/mac-arm64` as build staging.
