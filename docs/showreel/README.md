# GrokBot Meter showreel

A 30-second motion-graphics product intro for **GrokBot Meter**. The picture is a Remotion composition (React), not a screen recording. Product UI — bot mark, menu-bar pill, coffee cup, usage and day rails, theme chips, today rows — is drawn as vectors and animated on a beat grid.

## Specs

| | |
| --- | --- |
| File | `docs/showreel/grokbot-meter-showreel.mp4` |
| Duration | 30.0s (900 frames) |
| Size | 1920×1080 |
| Frame rate | 30 fps |
| Video | H.264, yuv420p |
| Audio | AAC, synced to the picture |

## Music

**Voltaic** by Kevin MacLeod ([incompetech.com](https://incompetech.com/)), 120 BPM.

Licensed under [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/). Commercial use is allowed with attribution.

> Music: Voltaic by Kevin MacLeod (incompetech.com)
> Licensed under Creative Commons: By Attribution 4.0 License

The edit in `showreel/public/voltaic-30.mp3` is the first 30.0 seconds, with a short fade in and a fade out from 28.35s to 30.0s. Full credit is also in `showreel/public/LICENSE-MUSIC.txt` and on the end card.

The picture sits on a dark void (vignette and grain only — no desktop wallpaper). It demos the product: menu-bar tray meter, Coffee popup with the cup, Today, then System light/dark and Coffee.

The kick lands about 75ms after each file-time downbeat, so the picture's beat grid is offset by **2 frames** at 30 fps. Downbeats used for cuts:

| Time | Frame | Hit |
| --- | --- | --- |
| 0.07s | 2 | Tray bar |
| 2.07s | 62 | Meter pill counts up |
| 4.07s | 122 | Click — Coffee popup opens |
| 6.3s | 190 | Cup starts filling |
| 14.07s | 422 | Today agents |
| 18.07s | 542 | Settings — System light |
| 20.07s | 602 | System dark |
| 22.07s | 662 | Coffee theme |
| 26.07s | 782 | End card |

Meters shown (68%, day 5, message counts) are design props, not live account data.

## Preview and render

From the repo root:

```bash
cd showreel
npm install
npm run preview
```

`preview` opens Remotion Studio at `http://localhost:3000`.

Render the master:

```bash
npm run render
```

That writes `docs/showreel/grokbot-meter-showreel.mp4`. On a machine with little RAM, render one frame at a time:

```bash
npm run render -- --concurrency=1
```

A single still (frame 340 is the filling cup):

```bash
npm run still -- ../docs/showreel/stills/coffee.png --frame=340
```

Linux renders in this repo's config use system Chrome when it is installed, and the `swangle` software GL renderer. macOS and Windows use Remotion's defaults. The first render on a machine without Chrome may download a headless browser.

## Source map

```
showreel/
  src/index.ts          register the composition
  src/Root.tsx          1920×1080, 30 fps, 900 frames
  src/Showreel.tsx      camera, soundtrack, vignette
  src/beats.ts          BPM and downbeat frames
  src/demo.tsx          tray, popup, today, theme, end card
  src/components.tsx    bot mark, cup, rails
  public/voltaic-30.mp3 soundtrack edit
  public/grain.png      overlay grain
```
