import { spawn } from "child_process";
import { createDecipheriv } from "crypto";
import { existsSync, readFileSync, statSync } from "fs";
import { join } from "path";

/** Chromium OSCrypt on Windows: AES-256-GCM. macOS safeStorage stays in macSafeStorage.ts. */
const V10_PREFIX = Buffer.from("v10");
const DPAPI_PREFIX = Buffer.from("DPAPI");
const GCM_NONCE_LEN = 12;
const GCM_TAG_LEN = 16;
export const WIN_OSCRYPT_KEY_LEN = 32;
const MAX_LOCAL_STATE_BYTES = 2 * 1024 * 1024;
const DPAPI_TIMEOUT_MS = 20_000;

/**
 * Env var passed only to the short-lived PowerShell helper. Holds the DPAPI
 * ciphertext already stored in Local State, never a token or the raw AES key.
 */
const DPAPI_IN_ENV = "GROKBOT_METER_DPAPI_IN";

const UNPROTECT_SCRIPT = [
  "$ErrorActionPreference='Stop'",
  "$ProgressPreference='SilentlyContinue'",
  "$utf8=New-Object System.Text.UTF8Encoding $false",
  "[Console]::OutputEncoding=$utf8",
  "$OutputEncoding=$utf8",
  "Add-Type -AssemblyName System.Security",
  `$b64=$env:${DPAPI_IN_ENV}`,
  `Remove-Item "Env:${DPAPI_IN_ENV}" -ErrorAction SilentlyContinue`,
  "if ([string]::IsNullOrWhiteSpace($b64)) { exit 2 }",
  "$enc=[Convert]::FromBase64String($b64)",
  "$dec=[System.Security.Cryptography.ProtectedData]::Unprotect($enc,$null,[System.Security.Cryptography.DataProtectionScope]::CurrentUser)",
  "[Console]::Out.Write([Convert]::ToBase64String($dec))",
].join("; ");

export type DpapiUnprotect = (blob: Buffer) => Promise<Buffer | null>;

/** `os_crypt.encrypted_key` from a parsed Local State object. */
export function osCryptEncryptedKey(localState: unknown): string | null {
  if (!localState || typeof localState !== "object") return null;
  const osCrypt = (localState as Record<string, unknown>)["os_crypt"];
  if (!osCrypt || typeof osCrypt !== "object") return null;
  const key = (osCrypt as Record<string, unknown>)["encrypted_key"];
  if (typeof key !== "string") return null;
  const trimmed = key.trim();
  return trimmed || null;
}

/** Bytes after the `DPAPI` header. Null when the header is absent. */
export function dpapiPayload(decodedKey: Buffer): Buffer | null {
  if (decodedKey.length <= DPAPI_PREFIX.length) return null;
  if (!decodedKey.subarray(0, DPAPI_PREFIX.length).equals(DPAPI_PREFIX)) return null;
  return decodedKey.subarray(DPAPI_PREFIX.length);
}

/**
 * Unwrap Grok Bot's OSCrypt key. `unprotect` is DPAPI CurrentUser
 * (`CryptUnprotectData`, null entropy). The raw key must be 32 bytes.
 * Uses Grok Bot's Local State key. Meter's Electron `safeStorage` key is a
 * different userData directory, so it cannot decrypt these tokens.
 */
export async function readOsCryptKeyFromLocalState(
  localState: unknown,
  unprotect: DpapiUnprotect,
): Promise<Buffer | null> {
  const b64 = osCryptEncryptedKey(localState);
  if (!b64) return null;
  const payload = dpapiPayload(Buffer.from(b64, "base64"));
  if (!payload || payload.length === 0) return null;
  const key = await unprotect(payload);
  if (!key || key.length !== WIN_OSCRYPT_KEY_LEN) return null;
  return key;
}

export async function readWindowsOsCryptKeyFromFile(
  localStatePath: string,
  unprotect: DpapiUnprotect = dpapiUnprotectCurrentUser,
): Promise<Buffer | null> {
  let size = 0;
  try {
    const st = statSync(localStatePath);
    if (!st.isFile()) return null;
    size = st.size;
  } catch {
    return null;
  }
  if (size <= 0 || size > MAX_LOCAL_STATE_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(localStatePath, "utf8").replace(/^\uFEFF/, ""));
  } catch {
    return null;
  }
  return readOsCryptKeyFromLocalState(parsed, unprotect);
}

/**
 * Decrypt a Chromium Windows `v10` blob: `v10 || nonce(12) || ciphertext || tag(16)`.
 * AES-256-GCM, empty AAD. The base64 text is what `sand-secrets.json` stores.
 */
export function decryptWindowsV10(b64: string, key: Buffer): string | null {
  if (key.length !== WIN_OSCRYPT_KEY_LEN) return null;
  const data = decodeCipherBlob(b64);
  if (!data || data.length < V10_PREFIX.length + GCM_NONCE_LEN + GCM_TAG_LEN) return null;
  if (!data.subarray(0, V10_PREFIX.length).equals(V10_PREFIX)) return null;
  const rest = data.subarray(V10_PREFIX.length);
  const nonce = rest.subarray(0, GCM_NONCE_LEN);
  const tag = rest.subarray(rest.length - GCM_TAG_LEN);
  const ciphertext = rest.subarray(GCM_NONCE_LEN, rest.length - GCM_TAG_LEN);
  try {
    const dec = createDecipheriv("aes-256-gcm", key, nonce);
    dec.setAuthTag(tag);
    const out = Buffer.concat([dec.update(ciphertext), dec.final()]);
    const text = out.toString("utf8").trim();
    return text || null;
  } catch {
    return null;
  }
}

/** PowerShell stdout → base64 text. Fail closed on CLIXML or other non-base64. */
export function decodeDpapiStdout(buf: Buffer): string | null {
  if (buf.length === 0) return null;
  let text: string;
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) text = buf.subarray(2).toString("utf16le");
  else if (buf.includes(0)) text = buf.toString("utf16le");
  else text = buf.toString("utf8");
  const compact = text.replace(/^\uFEFF/, "").replace(/\s+/g, "");
  if (!compact || !/^[A-Za-z0-9+/=]+$/.test(compact)) return null;
  return compact;
}

/**
 * DPAPI-unprotect for the current Windows user. No-op off win32.
 * Uses Windows PowerShell `ProtectedData.Unprotect` (CryptUnprotectData,
 * CurrentUser, null entropy), which matches Chromium's OSCrypt key wrap.
 * Never refreshes tokens and never writes Grok Bot's files.
 */
export function dpapiUnprotectCurrentUser(blob: Buffer): Promise<Buffer | null> {
  if (process.platform !== "win32" || blob.length === 0) return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: Buffer | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const child = spawn(powershellExe(), ["-NoProfile", "-NonInteractive", "-Command", UNPROTECT_SCRIPT], {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, [DPAPI_IN_ENV]: blob.toString("base64") },
    });
    const out: Buffer[] = [];
    child.stderr?.on("data", () => {});
    const timer = setTimeout(() => {
      child.kill();
      finish(null);
    }, DPAPI_TIMEOUT_MS);
    child.stdout?.on("data", (chunk: Buffer) => out.push(chunk));
    child.on("error", () => {
      clearTimeout(timer);
      finish(null);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) return finish(null);
      const b64 = decodeDpapiStdout(Buffer.concat(out));
      if (!b64) return finish(null);
      const key = Buffer.from(b64, "base64");
      finish(key.length > 0 ? key : null);
    });
  });
}

function powershellExe(): string {
  const root = process.env.SystemRoot || process.env.WINDIR;
  if (root) {
    const candidate = join(root, "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    if (existsSync(candidate)) return candidate;
  }
  return "powershell.exe";
}

function decodeCipherBlob(b64: string): Buffer | null {
  const trimmed = b64.trim();
  if (!trimmed) return null;
  const data = Buffer.from(trimmed, "base64");
  if (data.length > 0) return data;
  const alt = Buffer.from(trimmed, "base64url");
  return alt.length > 0 ? alt : null;
}
