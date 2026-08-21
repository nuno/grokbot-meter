# GrokBar

GrokBar is a CodexBar-like tray app for Grok Bot. Mac first.

Electron build (migrated from Tauri on `refactor/electron`):
```bash
npm run electron:dev      # dev with hot-reload
npm run electron:build    # tsc + electron-vite build + electron-builder (dist/mac-arm64 ~480M)
```

Perf harness (real env, no mocks):
```bash
npm run perf:baseline   # before
npm run perf:electron   # after
npm run perf:compare    # -> perf-results/report.md
```

Local git only, never push.
