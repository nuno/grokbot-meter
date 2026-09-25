# Security

GrokBot Meter is a local macOS tray companion with no backend and no telemetry. It reads Grok Bot's local files and encrypted access token, decrypts the token with the **Grok Bot Safe Storage** Keychain key (via `/usr/bin/security`, after macOS asks you), and calls Cursor's dashboard APIs with it. It never reads or uses Grok Bot's refresh token. The full list is in [What it accesses](README.md#what-it-accesses).

## Reporting a vulnerability

Please **do not** open a public issue with exploit details.

Report security issues via **[GitHub Security Advisories](https://github.com/nuno/grokbot-meter/security/advisories)** (preferred) or a private maintainer channel. Do not invent or use a dedicated security@ email unless one is published here later.

Public repository: [github.com/nuno/grokbot-meter](https://github.com/nuno/grokbot-meter).

## Known limitations

- The Keychain key is read through the `security` command-line tool. Choosing **Always Allow** in the macOS prompt grants that tool (not GrokBot Meter) ongoing access, so other local programs could read the key too. Choose **Allow** to avoid this.
- Builds are ad-hoc signed and not notarized.

## Scope notes

- Do not file reports that require stealing session tokens from another user's Keychain or Grok Bot install.
- Supply-chain / dependency CVEs: open a normal issue or PR with the advisory link.
