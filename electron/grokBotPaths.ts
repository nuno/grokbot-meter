import { homedir } from "os";
import { join } from "path";

/** Electron userData folder name for Grok Bot. Confirmed on a Windows loaner. */
const GROK_BOT_DIR = "Grok Bot";

export type GrokBotPathEnv = {
  home: string;
  platform: NodeJS.Platform;
  appData?: string | undefined;
};

export function currentGrokBotPathEnv(): GrokBotPathEnv {
  return {
    home: homedir(),
    platform: process.platform,
    appData: process.env.APPDATA,
  };
}

/**
 * `%APPDATA%\Grok Bot` on win32. Null on every other platform, even if
 * `APPDATA` is set, so Mac and Linux path lists stay as they are.
 */
export function windowsGrokBotSupportDir(env: GrokBotPathEnv): string | null {
  if (env.platform !== "win32") return null;
  const appData = env.appData?.trim();
  if (!appData) return null;
  return join(appData, GROK_BOT_DIR);
}

/** `sand-secrets.json` candidates. Mac order is unchanged when platform is not win32. */
export function sandSecretsPaths(env: GrokBotPathEnv = currentGrokBotPathEnv()): string[] {
  const { home } = env;
  const paths = [
    join(home, "Library/Application Support/Grok Bot/sand-secrets.json"),
    join(home, ".config/Grok Bot/sand-secrets.json"),
    join(home, ".grokbot/sand-secrets.json"),
    join(home, "Library/Application Support/Grok Bot/sand-client-persistence/sand-secrets.json"),
    join(home, ".config/Grok Bot/sand-client-persistence/sand-secrets.json"),
  ];
  const win = windowsGrokBotSupportDir(env);
  if (win) {
    paths.unshift(join(win, "sand-secrets.json"), join(win, "sand-client-persistence", "sand-secrets.json"));
  }
  return paths;
}

/** Today blob directories. Mac order is unchanged when platform is not win32. */
export function todayCandidateDirs(env: GrokBotPathEnv = currentGrokBotPathEnv()): string[] {
  const { home } = env;
  const dirs = [
    join(home, "Library/Application Support/Grok Bot/sand-client-persistence"),
    join(home, ".config/Grok Bot/sand-client-persistence"),
    join(home, ".grokbot"),
  ];
  const win = windowsGrokBotSupportDir(env);
  if (win) dirs.unshift(join(win, "sand-client-persistence"));
  return dirs;
}

/** Chromium/Electron `Local State` that holds `os_crypt.encrypted_key`. */
export function windowsLocalStatePath(env: GrokBotPathEnv = currentGrokBotPathEnv()): string | null {
  const win = windowsGrokBotSupportDir(env);
  return win ? join(win, "Local State") : null;
}
