# GrokBar — Simple User Guide

## What is GrokBar?

GrokBar is a small app that lives in your Mac's top menu bar (the tray).
It shows you, at a glance:

- **Weekly usage** — how much of your Grok weekly limit you have used (a percentage).
- **Today's activity** — how many messages you sent to Grok today, and how many agents you used.
- **Recent sessions** — a list of your latest Grok agents.

You do not need to open a browser. Just look at the menu bar.

## How to install

You need to build the app once (it is not on an app store yet).

1. Open the Terminal.
2. Go to the project folder.
3. Run these commands:

```bash
npm install
npm run electron:build
```

This creates an unpacked app in `dist/mac-arm64` and versioned DMG/zip under `releases/<version>/`. Open the DMG (or `dist/mac-arm64`) and drag **GrokBar** to Applications.

> Note: the first build is unsigned. If macOS blocks it, right-click → **Open**. See `docs/MAC-RELEASE.md`.
>
> `dist/mac-arm64` is large (~480 MB) because it bundles the Electron runtime.

## How to use

1. Start **GrokBar** from your Applications folder.
2. A small icon appears in the top-right menu bar.
3. Click the icon to open the popup window with your stats.
4. Click anywhere outside the window to close it.

### The menu bar icon

- The number shown next to the icon is your **weekly usage %** (for example `42%`).
- If there is no weekly data, it shows today's message count instead.
- Hover the icon to see a tooltip.

### Right-click the icon

A small menu appears:

- **About GrokBar** — shows app information.
- **Quit GrokBar** — closes the app completely.

## What the popup shows

| Section  | Meaning                                                        |
| -------- | ------------------------------------------------------------- |
| Weekly   | A bar showing your weekly usage percentage and reset info.    |
| Today    | Number of messages and agents used today.                     |
| Sessions | Your most recent Grok agents, newest first.                   |

## Where the data comes from

GrokBar reads local data saved by **Grok Bot** on your Mac. It also checks
your Grok account to show the weekly usage percentage. Your data stays on your
computer; GrokBar only reads files that Grok Bot already created.

## Common questions

**The icon shows nothing / a dash (`—`).**
GrokBar could not read your weekly usage. This usually means you are not signed
in to Grok, or the account token is missing. Your today's activity may still
show when you open the popup.

**The popup is blank or says "Loading…".**
Give it a few seconds. If it stays blank, quit and reopen the app.

**I want to remove GrokBar.**
Right-click the menu bar icon and choose **Quit GrokBar**, then delete the app
from Applications.

## For developers

The technical README (build commands, performance tests) is in `README.md`.
