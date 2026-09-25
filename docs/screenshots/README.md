# Screenshots

| File | What |
| ---- | ---- |
| [`menubar.png`](menubar.png) | Menu bar status item — bot face + weekly % |
| [`popup.png`](popup.png) | Main popover (light) — Weekly, on-demand, Today, footer |
| [`popup-dark.png`](popup-dark.png) | Main popover (dark) — same layout |

## Capture notes

- Prefer a current release build (`releases/<ver>/` or `dist/mac-arm64/GrokBot Meter.app`), or `electron:dev` with preview mocks for docs.
- Do **not** click **Refresh** / force `GetSandUsageStatus` just for docs. Opening the panel once for a shot is OK.
- Skip Settings if it needs extra navigations that risk spend; email lives in Settings and should stay out of public shots.
- Capture light and dark when showing the popup; crop tidy retina PNGs; redact account email if it ever appears.
