import { execFileSync } from "child_process";
import { closeSync, existsSync, openSync, readFileSync, readSync, statSync } from "fs";
import { join } from "path";
import {
  currentGrokBotPathEnv,
  windowsGrokBotSupportDir,
  windowsLocalStatePath,
  type GrokBotPathEnv,
} from "./grokBotPaths.ts";

const GROK_BOT_INFO = "/Applications/Grok Bot.app/Contents/Info";
const GROK_BOT_PLIST = "/Applications/Grok Bot.app/Contents/Info.plist";
const CACHE_TTL_MS = 30_000;
const INSTALL_DIR_NAME = "Grok Bot";
const EXE_NAME = "Grok Bot.exe";
const MAX_TEXT_BYTES = 256 * 1024;
const MAX_ASAR_HEADER_BYTES = 1024 * 1024;
const MAX_ASAR_PACKAGE_BYTES = 256 * 1024;

/**
 * About renders `Grok Bot ${version}`. This is not a version number. It is
 * returned when Windows support files show Grok Bot is present but no version
 * string could be read, so About says "Grok Bot (installed)" instead of
 * "not installed".
 */
export const GROK_BOT_PRESENT_VERSION = "(installed)";

/** Env var for the exe path. Kept out of the PowerShell command text. */
const WINDOWS_EXE_ENV = "GROKBOT_METER_EXE";

/**
 * UTF-8 stdout, same approach as the DPAPI helper. ProductVersion is preferred
 * by {@link pickWindowsExeVersion}; FileVersion is the fallback.
 */
export const WINDOWS_EXE_VERSION_SCRIPT = [
  "$ErrorActionPreference='Stop'",
  "$ProgressPreference='SilentlyContinue'",
  "$utf8=New-Object System.Text.UTF8Encoding $false",
  "[Console]::OutputEncoding=$utf8",
  "$OutputEncoding=$utf8",
  `$vi=(Get-Item -LiteralPath $env:${WINDOWS_EXE_ENV}).VersionInfo`,
  "[Console]::Out.WriteLine($vi.ProductVersion)",
  "[Console]::Out.WriteLine($vi.FileVersion)",
].join("; ");

let cached: { value: string | null; at: number } | null = null;

export type GrokBotVersionEnv = GrokBotPathEnv & {
  localAppData?: string | undefined;
  programFiles?: string | undefined;
  programFilesX86?: string | undefined;
};

export type GrokBotVersionDeps = {
  exists: (path: string) => boolean;
  readText: (path: string) => string | null;
  /** Mac `defaults` / `PlistBuddy`. Throws on failure. Return value is trimmed. */
  execFile: (file: string, args: string[]) => string;
  /** Windows exe ProductVersion / FileVersion. Null when unreadable. */
  exeVersion: (exePath: string) => string | null;
  fileSize: (path: string) => number | null;
  readAt: (path: string, offset: number, length: number) => Buffer | null;
};

/**
 * Installed Grok Bot version for About.
 * macOS reads CFBundleShortVersionString and returns null when the bundle is absent.
 * Windows returns a version when one is cheap to read, `(installed)` when the
 * support directory or auth files exist, and null when Grok Bot is absent.
 */
export function getGrokBotVersion(): string | null {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.value;

  const value = readGrokBotVersion(currentGrokBotVersionEnv());
  cached = { value, at: now };
  return value;
}

export function currentGrokBotVersionEnv(): GrokBotVersionEnv {
  return {
    ...currentGrokBotPathEnv(),
    localAppData: process.env.LOCALAPPDATA,
    programFiles: process.env.ProgramFiles,
    programFilesX86: process.env["ProgramFiles(x86)"],
  };
}

/** Platform-injected reader. Tests pass `deps` so CI never runs Mac `defaults`. */
export function readGrokBotVersion(
  env: GrokBotVersionEnv,
  deps: GrokBotVersionDeps = defaultDeps,
): string | null {
  if (env.platform === "win32") return readWindowsGrokBotVersion(env, deps);
  return readMacGrokBotVersion(deps);
}

/** First line is ProductVersion, second is FileVersion. */
export function pickWindowsExeVersion(stdout: string): string | null {
  const lines = stdout.replace(/^\uFEFF/, "").split(/\r?\n/);
  const product = cleanVersion(lines[0] ?? "");
  if (product) return product;
  return cleanVersion(lines[1] ?? "");
}

/**
 * PowerShell 5.1 often writes UTF-16 to a pipe. Same detection as the DPAPI
 * helper: BOM, otherwise any NUL byte means UTF-16LE.
 */
export function pickWindowsExeVersionFromStdout(buf: Buffer): string | null {
  if (buf.length === 0) return null;
  let text: string;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) text = buf.subarray(2).toString("utf16le");
  else if (buf.includes(0)) text = buf.toString("utf16le");
  else text = buf.toString("utf8");
  return pickWindowsExeVersion(text);
}

export function versionFromUpdateYml(text: string): string | null {
  const match = text.match(/^\s*version:\s*['"]?([^'"#\r\n]+?)['"]?\s*$/m);
  if (!match?.[1]) return null;
  return cleanVersion(match[1]);
}

export function versionFromPackageJson(text: string): string | null {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const version = (parsed as { version?: unknown }).version;
    if (typeof version !== "string") return null;
    return cleanVersion(version);
  } catch {
    return null;
  }
}

/**
 * `package.json` version from an Electron asar. Header layout matches
 * electron/asar: 8-byte size pickle, header pickle, then file bytes.
 * `offset` in the header is relative to the start of the file section.
 */
export function packageVersionFromAsarReader(
  fileSize: number,
  read: (offset: number, length: number) => Buffer | null,
): string | null {
  if (fileSize < 16) return null;
  const sizeBuf = read(0, 8);
  if (!sizeBuf || sizeBuf.length !== 8) return null;
  if (sizeBuf.readUInt32LE(0) !== 4) return null;
  const headerPickleSize = sizeBuf.readUInt32LE(4);
  if (headerPickleSize < 8 || headerPickleSize > MAX_ASAR_HEADER_BYTES) return null;
  if (8 + headerPickleSize > fileSize) return null;
  const headerBuf = read(8, headerPickleSize);
  if (!headerBuf || headerBuf.length !== headerPickleSize) return null;
  const payloadSize = headerBuf.readUInt32LE(0);
  if (payloadSize < 8 || payloadSize + 4 > headerBuf.length) return null;
  const strLen = headerBuf.readInt32LE(4);
  if (strLen <= 2 || strLen > payloadSize - 4) return null;
  if (8 + strLen > headerBuf.length) return null;
  let header: unknown;
  try {
    header = JSON.parse(headerBuf.subarray(8, 8 + strLen).toString("utf8"));
  } catch {
    return null;
  }
  const entry = asarPackageEntry(header);
  if (!entry) return null;
  const dataOffset = 8 + headerPickleSize + entry.offset;
  if (dataOffset < 0 || entry.size > fileSize - dataOffset) return null;
  const body = read(dataOffset, entry.size);
  if (!body || body.length !== entry.size) return null;
  return versionFromPackageJson(body.toString("utf8"));
}

function readMacGrokBotVersion(deps: GrokBotVersionDeps): string | null {
  try {
    if (!deps.exists(GROK_BOT_PLIST)) return null;
    const out = deps.execFile("/usr/bin/defaults", ["read", GROK_BOT_INFO, "CFBundleShortVersionString"]);
    return out.length > 0 ? out : null;
  } catch {
    try {
      const out = deps.execFile("/usr/libexec/PlistBuddy", [
        "-c",
        "Print :CFBundleShortVersionString",
        GROK_BOT_PLIST,
      ]);
      return out.length > 0 ? out : null;
    } catch {
      return null;
    }
  }
}

function readWindowsGrokBotVersion(env: GrokBotVersionEnv, deps: GrokBotVersionDeps): string | null {
  try {
    const version = readWindowsInstallVersion(env, deps);
    if (version) return version;
    if (windowsSupportPresent(env, deps.exists)) return GROK_BOT_PRESENT_VERSION;
    return null;
  } catch {
    return windowsSupportPresent(env, deps.exists) ? GROK_BOT_PRESENT_VERSION : null;
  }
}

function windowsSupportPresent(env: GrokBotVersionEnv, exists: (path: string) => boolean): boolean {
  const dir = windowsGrokBotSupportDir(env);
  if (!dir) return false;
  if (exists(dir)) return true;
  if (exists(join(dir, "sand-secrets.json"))) return true;
  if (exists(join(dir, "sand-client-persistence", "sand-secrets.json"))) return true;
  const state = windowsLocalStatePath(env);
  return Boolean(state && exists(state));
}

function readWindowsInstallVersion(env: GrokBotVersionEnv, deps: GrokBotVersionDeps): string | null {
  for (const root of windowsInstallRoots(env)) {
    const version = versionFromInstallRoot(root, deps);
    if (version) return version;
  }
  return null;
}

function windowsInstallRoots(env: GrokBotVersionEnv): string[] {
  const roots: string[] = [];
  const local = env.localAppData?.trim();
  if (local) roots.push(join(local, "Programs", INSTALL_DIR_NAME));
  else if (env.home.trim()) roots.push(join(env.home.trim(), "AppData", "Local", "Programs", INSTALL_DIR_NAME));
  const programFiles = env.programFiles?.trim();
  if (programFiles) roots.push(join(programFiles, INSTALL_DIR_NAME));
  const programFilesX86 = env.programFilesX86?.trim();
  if (programFilesX86) roots.push(join(programFilesX86, INSTALL_DIR_NAME));
  return uniquePaths(roots);
}

function versionFromInstallRoot(root: string, deps: GrokBotVersionDeps): string | null {
  const asar = packageVersionFromAsarPath(join(root, "resources", "app.asar"), deps);
  if (asar) return asar;
  const unpacked = versionFromPackageText(deps.readText(join(root, "resources", "app", "package.json")));
  if (unpacked) return unpacked;
  const unpackedAsar = versionFromPackageText(
    deps.readText(join(root, "resources", "app.asar.unpacked", "package.json")),
  );
  if (unpackedAsar) return unpackedAsar;
  const yml = deps.readText(join(root, "resources", "app-update.yml"));
  if (yml) {
    const fromYml = versionFromUpdateYml(yml);
    if (fromYml) return fromYml;
  }
  const exe = join(root, EXE_NAME);
  if (!deps.exists(exe)) return null;
  try {
    return cleanVersion(deps.exeVersion(exe) ?? "");
  } catch {
    return null;
  }
}

function versionFromPackageText(text: string | null): string | null {
  if (!text) return null;
  return versionFromPackageJson(text);
}

function packageVersionFromAsarPath(path: string, deps: GrokBotVersionDeps): string | null {
  try {
    const size = deps.fileSize(path);
    if (size == null) return null;
    return packageVersionFromAsarReader(size, (offset, length) => deps.readAt(path, offset, length));
  } catch {
    return null;
  }
}

function asarPackageEntry(header: unknown): { offset: number; size: number } | null {
  if (!header || typeof header !== "object") return null;
  const files = (header as { files?: unknown }).files;
  if (!files || typeof files !== "object") return null;
  const pkg = (files as Record<string, unknown>)["package.json"];
  if (!pkg || typeof pkg !== "object") return null;
  const size = (pkg as { size?: unknown }).size;
  const offset = asarOffset((pkg as { offset?: unknown }).offset);
  if (typeof size !== "number" || !Number.isInteger(size) || size < 2 || size > MAX_ASAR_PACKAGE_BYTES) return null;
  if (offset == null) return null;
  return { offset, size };
}

function asarOffset(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const n = Number(value);
    if (Number.isSafeInteger(n)) return n;
  }
  return null;
}

function cleanVersion(raw: string): string | null {
  const line = raw.replace(/\0/g, "").trim();
  if (!line || line.length > 80) return null;
  if (!/\d/.test(line)) return null;
  const short = line.match(/^(\d+\.\d+\.\d+)\.0$/)?.[1];
  return short ?? line;
}

function uniquePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const path of paths) {
    const key = path.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(path);
  }
  return out;
}

function readTextFile(path: string): string | null {
  try {
    const st = statSync(path);
    if (!st.isFile() || st.size <= 0 || st.size > MAX_TEXT_BYTES) return null;
    return readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  } catch {
    return null;
  }
}

function fileSizeOf(path: string): number | null {
  try {
    const st = statSync(path);
    return st.isFile() ? st.size : null;
  } catch {
    return null;
  }
}

function readAtFile(path: string, offset: number, length: number): Buffer | null {
  if (offset < 0 || length <= 0 || length > MAX_ASAR_HEADER_BYTES) return null;
  let fd: number | null = null;
  try {
    fd = openSync(path, "r");
    const buf = Buffer.alloc(length);
    const n = readSync(fd, buf, 0, length, offset);
    if (n !== length) return null;
    return buf;
  } catch {
    return null;
  } finally {
    if (fd != null) {
      try {
        closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }
}

function execFile(file: string, args: string[]): string {
  return execFileSync(file, args, { encoding: "utf8", timeout: 3_000 }).trim();
}

function powershellExe(): string {
  const root = process.env.SystemRoot || process.env.WINDIR;
  if (root) {
    const candidate = join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    if (existsSync(candidate)) return candidate;
  }
  return "powershell.exe";
}

function readWindowsExeVersion(exePath: string): string | null {
  try {
    const out = execFileSync(powershellExe(), ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_EXE_VERSION_SCRIPT], {
      timeout: 3_000,
      windowsHide: true,
      env: { ...process.env, [WINDOWS_EXE_ENV]: exePath },
    });
    return pickWindowsExeVersionFromStdout(out);
  } catch {
    return null;
  }
}

const defaultDeps: GrokBotVersionDeps = {
  exists: existsSync,
  readText: readTextFile,
  execFile,
  exeVersion: readWindowsExeVersion,
  fileSize: fileSizeOf,
  readAt: readAtFile,
};
