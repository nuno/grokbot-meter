# Contributing

Thanks for helping with GrokBar. Mac-first Electron tray app; keep changes small and reviewable.

## Setup

```bash
npm install
npm run electron:dev
```

Requires Grok Bot installed/signed-in on the Mac for real meters. UI preview mocks live in `src/lib/previewMocks.ts` (local only — they must never enable on-demand spend).

## Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run electron:dev` | Dev with hot reload |
| `npm run electron:build` | Unsigned arm64 build + DMG/zip under `releases/<version>/` |
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
