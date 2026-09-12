import { execFileSync } from "child_process";
import { existsSync } from "fs";

const GROK_BOT_INFO = "/Applications/Grok Bot.app/Contents/Info";
const GROK_BOT_PLIST = "/Applications/Grok Bot.app/Contents/Info.plist";
const CACHE_TTL_MS = 30_000;

let cached: { value: string | null; at: number } | null = null;

/** Read installed Grok Bot app version from local Info.plist only. */
export function getGrokBotVersion(): string | null {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  const value = readVersion();
  cached = { value, at: now };
  return value;
}

function readVersion(): string | null {
  try {
    if (!existsSync(GROK_BOT_PLIST)) return null;
    const out = execFileSync(
      "/usr/bin/defaults",
      ["read", GROK_BOT_INFO, "CFBundleShortVersionString"],
      { encoding: "utf8", timeout: 3_000 },
    ).trim();
    return out.length > 0 ? out : null;
  } catch {
    try {
      const out = execFileSync(
        "/usr/libexec/PlistBuddy",
        ["-c", "Print :CFBundleShortVersionString", GROK_BOT_PLIST],
        { encoding: "utf8", timeout: 3_000 },
      ).trim();
      return out.length > 0 ? out : null;
    } catch {
      return null;
    }
  }
}
