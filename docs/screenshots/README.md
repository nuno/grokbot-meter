# Screenshots

| File | What |
| ---- | ---- |
| [`menubar.png`](menubar.png) | Menu bar status item — bot face + weekly % |
| [`menubar2.png`](menubar2.png) | Menu bar status item — bot face + weekly % |
| [`popup.png`](popup.png) | Main popover (light) — Weekly, on-demand, Today, footer |
| [`popup-dark.png`](popup-dark.png) | Main popover (dark) — same layout |
| [`popup-break.png`](popup-break.png) | Main popover in the Break theme — cup at 68%, on-demand in the credit corner |
| [`popup-break-full.png`](popup-break-full.png) | Break theme near the weekly cap — red spotlight, rails and percentage |
| [`week-loop.gif`](week-loop.gif) | README hero — 8s loop, cup 0% → 96% then drain/reset. GIF fallback of the MP4 |
| [`week-loop.mp4`](week-loop.mp4) | Same loop as 60fps retina H.264 |
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
- `week-loop.*` are not screen captures. The real `App` runs in an iframe with
  `window.api` stubbed, on a dark graded field (no OS chrome). Each frame's
  exact state is computed (`pct`, days left, spill colour), set, then captured
  over CDP as JPEG at `deviceScaleFactor: 2`. PNG is ~8× slower and drops the
  capture below 5 fps. Assemble at 60fps so playback matches the 8s loop.
- Encode the GIF with `palettegen=stats_mode=full`. `stats_mode=diff` silently
  drops the critical red and renders the 96% state as amber. Keep the camera
  locked — a Ken Burns push-in touches every pixel of every frame and balloons
  the GIF.
