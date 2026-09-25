# Contributing

Thanks for helping with GrokBot Meter. Mac-first Electron tray app; keep changes small and reviewable.

## Setup

```bash
npm install
npm run electron:dev
```

Requires Grok Bot installed/signed-in on the Mac for real meters. UI preview mocks live in `src/lib/previewMocks.ts` (local only, and only active under `import.meta.env.DEV` — they must never enable on-demand spend).

Use the **`electron:*`** scripts only. There is no standalone Vite `dev` / `build` / `preview` path — the real app entry is `electron-vite` via `electron.vite.config.ts`.

## Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run electron:dev` | Dev with hot reload |
| `npm run electron:build` | Ad-hoc signed arm64 build + DMG/zip under `releases/<version>/` |
| `npm run electron:preview` | Preview a production electron-vite build |
| `npm run icons:gen` | Regenerate icns / png / tray templates from the canonical Bot mark |
| `npm run electron:build:release` | Same packaging path intended for Developer ID + notarization (see `docs/MAC-RELEASE.md`) |

## Product rules

- Show **official Grok Bot meters only** — no invented weekly caps or fake usage.
- Do not burn account usage for screenshots or QA (avoid live Refresh / on-demand spend).
- Do not commit secrets, `.env`, QA scratch (`.qa-*`, `verify-*`, `.ui-review`), or large binaries under `releases/`.

## PRs

1. Branch from `master`.
2. Keep commits focused; match existing message style (`feat:`, `fix:`, `chore:`).
3. Update docs if install/release behavior changes.
