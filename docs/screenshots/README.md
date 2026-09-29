# Screenshots

| File | What |
| ---- | ---- |
| [`menubar.png`](menubar.png) | Menu bar status item — bot face + weekly % |
| [`menubar2.png`](menubar2.png) | Menu bar status item — bot face + weekly % |
| [`popup.png`](popup.png) | Main popover (light) — Weekly, on-demand, Today, footer |
| [`popup-dark.png`](popup-dark.png) | Main popover (dark) — same layout |
| [`popup-break.png`](popup-break.png) | Main popover in the Break theme — cup at 68%, on-demand in the credit corner |
| [`popup-break-full.png`](popup-break-full.png) | Break theme near the weekly cap — red spotlight, rails and percentage |
| [`desktop-focus.png`](desktop-focus.png) | Same desktop demo with other status items grayed out and ours highlighted |
| [`grokbot-meter-desktop-demo.png`](grokbot-meter-desktop-demo.png) | Full desktop demo with the dark popover anchored to the highlighted menu-bar meter |
| [`grokbot-meter-desktop-demo-light.png`](grokbot-meter-desktop-demo-light.png) | Full desktop demo with the light popover anchored to the highlighted menu-bar meter |
| [`social-preview.jpg`](social-preview.jpg) | 1280×640 JPEG under 1 MB for the GitHub social preview (Settings → General) |

## Capture notes

- Prefer a current release build (`releases/<ver>/` or `dist/mac-arm64/GrokBot Meter.app`), or `electron:dev` with preview mocks for docs.
- Do **not** click **Refresh** / force `GetSandUsageStatus` just for docs. Opening the panel once for a shot is OK.
- Skip Settings if it needs extra navigations that risk spend; email lives in Settings and should stay out of public shots.
- Capture light and dark when showing the popup; crop tidy retina PNGs; redact account email if it ever appears.
- Break has no light variant — it paints its own opaque panel in both appearances, so one shot covers it.
