import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createDecipheriv, pbkdf2Sync } from "crypto";

const CACHE_TTL = 60_000;
const HTTP_TIMEOUT = 12_000;
const USAGE_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetSandUsageStatus";
const ME_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetMe";
const TOKEN_URL = "https://api2.cursor.sh/oauth/token";
const OAUTH_CLIENT_ID = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB";
const SECOND_MS_THRESHOLD = 100_000_000_000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PBKDF2_SALT = Buffer.from("saltysalt");
const PBKDF2_ITERS = 1003;
const V10_PREFIX = Buffer.from("v10");

export type WeeklyStatus = {
  signedIn: boolean;
  includedLimitZero: boolean;
  usagePercent: number | null;
  nextResetAt: number | null;
  currentPeriodStart: string | null;
  upgradeLabel: string | null;
  sandTrial: boolean;
  sandTrialExpiresAt: number | null;
  hasNonZeroIncludedLimit: boolean | null;
  hasAvailableUsage: boolean | null;
  accountEmail: string | null;
  error: string | null;
};

let cache: { fetchedAt: number; status: WeeklyStatus } | null = null;
let cryptKeyCache: Buffer | null = null;

export function getWeeklyStatus(): WeeklyStatus {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache.status;
  return emptyStatus();
}

export async function getWeeklyStatusAsync(): Promise<WeeklyStatus> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache.status;
  const fresh = await fetchStatusAsync();
  cache = { fetchedAt: Date.now(), status: fresh };
  return fresh;
}

function emptyStatus(): WeeklyStatus {
  return {
    signedIn: false,
    includedLimitZero: false,
    usagePercent: null,
    nextResetAt: null,
    currentPeriodStart: null,
    upgradeLabel: null,
    sandTrial: false,
    sandTrialExpiresAt: null,
    hasNonZeroIncludedLimit: null,
    hasAvailableUsage: null,
    accountEmail: null,
    error: null,
  };
}
function signedOut(error: string | null): WeeklyStatus {
  return { ...emptyStatus(), error };
}
function errStatus(signedIn: boolean, error: string): WeeklyStatus {
  return { ...emptyStatus(), signedIn, error: sanitizeError(error) };
}

async function fetchStatusAsync(): Promise<WeeklyStatus> {
  let tokens = loadTokens();
  if (!tokens.access || !looksLikeJwt(tokens.access)) {
    if (tokens.refresh) {
      const r = await refreshAccess(tokens.refresh);
      if (r.kind === "access") tokens.access = r.token;
      else if (r.kind === "signedOut") return signedOut(null);
      else return errStatus(true, "network error");
    } else return signedOut(null);
  }
  const access = tokens.access?.trim();
  if (!access || !looksLikeJwt(access)) return signedOut(null);

  const usage = await callUsage(access);
  if (usage.kind === "ok") return withAccountEmail(parseUsage(usage.value), access);
  if (usage.kind === "unauthorized") {
    if (!tokens.refresh) return signedOut(null);
    const r = await refreshAccess(tokens.refresh);
    if (r.kind === "access") {
      const retry = await callUsage(r.token);
      if (retry.kind === "ok") return withAccountEmail(parseUsage(retry.value), r.token);
      if (retry.kind === "unauthorized") return signedOut(null);
      return errStatus(true, retry.error);
    }
    if (r.kind === "failed") return errStatus(true, "network error");
    return signedOut(null);
  }
  return errStatus(true, usage.error);
}

async function withAccountEmail(status: WeeklyStatus, access: string): Promise<WeeklyStatus> {
  status.accountEmail = await fetchAccountEmail(access);
  return status;
}

async function callUsage(access: string): Promise<{ kind: "ok"; value: unknown } | { kind: "unauthorized" } | { kind: "failed"; error: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT);
    const res = await fetch(USAGE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
      },
      body: "{}",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.status === 401) return { kind: "unauthorized" };
    if (!res.ok) return { kind: "failed", error: `usage request failed (HTTP ${res.status})` };
    const body = await res.text();
    try {
      return { kind: "ok", value: JSON.parse(body) };
    } catch {
      return { kind: "failed", error: "unexpected usage response" };
    }
  } catch {
    return { kind: "failed", error: "network error" };
  }
}

async function fetchAccountEmail(access: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT);
    const res = await fetch(ME_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
      },
      body: "{}",
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const v = JSON.parse(await res.text());
    return extractAccountLabel(v);
  } catch {
    return null;
  }
}

function extractAccountLabel(v: unknown): string | null {
  const obj = v as Record<string, unknown>;
  const from = (o: Record<string, unknown>) =>
    (jsonStr(o, "email", "Email") ?? jsonStr(o, "userEmail", "user_email") ?? jsonStr(o, "displayName", "display_name"))
      ?.trim() || null;
  let r = from(obj);
  if (r) return r;
  if (obj["user"] && typeof obj["user"] === "object") r = from(obj["user"] as Record<string, unknown>);
  if (r) return r;
  if (obj["me"] && typeof obj["me"] === "object") r = from(obj["me"] as Record<string, unknown>);
  return r || null;
}

async function refreshAccess(refresh: string): Promise<{ kind: "access"; token: string } | { kind: "signedOut" } | { kind: "failed" }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), HTTP_TIMEOUT);
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "refresh_token", client_id: OAUTH_CLIENT_ID, refresh_token: refresh }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const body = await res.text();
    let v: unknown;
    try {
      v = JSON.parse(body);
    } catch {
      return { kind: "failed" };
    }
    return parseRefreshJson(v as Record<string, unknown>, res.status);
  } catch {
    return { kind: "failed" };
  }
}

function parseRefreshJson(v: Record<string, unknown>, httpStatus: number): { kind: "access"; token: string } | { kind: "signedOut" } | { kind: "failed" } {
  if (jsonBool(v, "shouldLogout", "should_logout")) return { kind: "signedOut" };
  if (httpStatus === 401) return { kind: "signedOut" };
  if (httpStatus < 200 || httpStatus >= 300) return { kind: "failed" };
  const t = jsonStr(v, "access_token", "accessToken");
  if (t && looksLikeJwt(t)) return { kind: "access", token: t };
  return { kind: "signedOut" };
}

function parseUsage(v: unknown): WeeklyStatus {
  const o = v as Record<string, unknown>;
  const includedLimitZero = jsonBool(o, "includedLimitZero", "included_limit_zero") ?? false;
  const hasNonZeroIncludedLimit = jsonBool(o, "hasNonZeroIncludedLimit", "has_non_zero_included_limit") ?? null;
  const hasAvailableUsage = jsonBool(o, "hasAvailableUsage", "has_available_usage") ?? null;
  const usagePercent = jsonF64(o, "usagePercent", "usage_percent") ?? null;
  const currentPeriodStart =
    (jsonStr(o, "currentPeriodStart", "current_period_start") as string | null) ?? valueToString(o["currentPeriodStart"] ?? o["current_period_start"]);
  let nextResetAt = parseTimestampMs(o["nextResetTimestampUtc"] ?? o["next_reset_timestamp_utc"]);
  const sandTrialExpiresAt = parseTimestampMs(o["sandTrialExpiresAt"] ?? o["sand_trial_expires_at"]);
  const sandTrial = sandTrialExpiresAt != null ? sandTrialExpiresAt > Date.now() : false;

  if (nextResetAt == null && (usagePercent != null || sandTrial)) {
    const start = currentPeriodStart ? parseRfc3339Ms(currentPeriodStart) : null;
    if (start != null) nextResetAt = start + WEEK_MS;
    else {
      const s2 = parseTimestampMs(o["currentPeriodStart"] ?? o["current_period_start"]);
      if (s2 != null) nextResetAt = s2 + WEEK_MS;
      else if (sandTrialExpiresAt != null) nextResetAt = sandTrialExpiresAt;
    }
  }

  return {
    signedIn: true,
    includedLimitZero,
    usagePercent,
    nextResetAt,
    currentPeriodStart: currentPeriodStart ?? null,
    upgradeLabel: upgradeLabel(o),
    sandTrial,
    sandTrialExpiresAt,
    hasNonZeroIncludedLimit: hasNonZeroIncludedLimit as boolean | null,
    hasAvailableUsage: hasAvailableUsage as boolean | null,
    accountEmail: null,
    error: null,
  };
}

function upgradeLabel(v: Record<string, unknown>): string | null {
  const cta = (x: unknown) => (x as { cta?: { label?: string } })?.cta?.label ?? null;
  return (
    cta(v["upgradeRecommendation"] ?? v["upgrade_recommendation"]) ??
    (() => {
      const arr = (v["upgradeRecommendations"] ?? v["upgrade_recommendations"]) as unknown[] | undefined;
      if (Array.isArray(arr) && arr[0]) return cta(arr[0]);
      return null;
    })() ??
    null
  );
}
function parseTimestampMs(v: unknown): number | null {
  if (typeof v === "string") return parseRfc3339Ms(v) ?? (Number.isFinite(Number(v)) ? normalizeEpoch(Number(v)) : null);
  if (typeof v === "number") return normalizeEpoch(v);
  return null;
}
function parseRfc3339Ms(s: string): number | null {
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}
function normalizeEpoch(n: number): number {
  return Math.abs(n) >= SECOND_MS_THRESHOLD ? n : n * 1000;
}
function valueToString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return null;
}
function jsonBool(v: Record<string, unknown>, camel: string, snake: string): boolean | null {
  const x = v[camel] ?? v[snake];
  if (typeof x === "boolean") return x;
  if (typeof x === "number") return x !== 0;
  return null;
}
function jsonStr(v: Record<string, unknown>, camel: string, snake: string): string | null {
  const x = v[camel] ?? v[snake];
  return typeof x === "string" ? x : null;
}
function jsonF64(v: Record<string, unknown>, camel: string, snake: string): number | null {
  const x = v[camel] ?? v[snake];
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function looksLikeJwt(token: string): boolean {
  const t = token.trim();
  if (t.length < 24) return false;
  const parts = t.split(".");
  if (parts.length !== 3 || parts.some((p) => !p)) return false;
  return /^[A-Za-z0-9._\-+/=]+$/.test(t);
}
function sanitizeError(msg: string): string {
  const out: string[] = [];
  for (const raw of msg.split(/\s+/)) {
    const cleaned = raw.replace(/^["',]+|["',]+$/g, "");
    const lower = cleaned.toLowerCase();
    if (
      looksLikeJwt(cleaned) ||
      lower.includes("bearer") ||
      lower.includes("authorization") ||
      (cleaned.length > 40 && /^[A-Za-z0-9\-_\.+/=]+$/.test(cleaned))
    )
      out.push("[redacted]");
    else out.push(raw);
  }
  let s = out.join(" ");
  if (s.length > 160) s = s.slice(0, 160) + "…";
  return s || "usage request failed";
}

function homeDir(): string {
  return homedir();
}
function loadTokens(): { access?: string; refresh?: string } {
  const tokens: { access?: string; refresh?: string } = {};
  const key = cryptKey();
  for (const p of sandSecretsPaths()) {
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, "utf8");
      const val = JSON.parse(raw) as Record<string, unknown>;
      if (!tokens.access || !looksLikeJwt(tokens.access)) {
        const c = jsonStr(val, "cursor-access-token", "cursorAccessToken");
        if (c) {
          const u = unwrapSecret(c, key);
          if (u && looksLikeJwt(u)) tokens.access = u;
        }
      }
      if (!tokens.refresh) {
        const c = jsonStr(val, "cursor-refresh-token", "cursorRefreshToken");
        if (c) {
          const u = unwrapSecret(c, key);
          if (u) tokens.refresh = u;
        }
      }
      if ((!tokens.access || !looksLikeJwt(tokens.access)) || !tokens.refresh) {
        const pair = extractFromCursorAccounts(val, key);
        if (pair) {
          const hasValidAccess = tokens.access != null && looksLikeJwt(tokens.access);
          // Use pair atomically to avoid mixing access from file A with refresh from file B
          if (!hasValidAccess && pair.access) {
            tokens.access = pair.access;
            if (pair.refresh) tokens.refresh = pair.refresh;
          } else if (!hasValidAccess && !pair.access && pair.refresh && !tokens.refresh) {
            tokens.refresh = pair.refresh;
          }
          // if hasValidAccess, ignore pair.refresh from different account
        }
      }
      if (tokens.access && looksLikeJwt(tokens.access) && tokens.refresh) break;
    } catch {}
  }
  return tokens;
}
function extractFromCursorAccounts(val: Record<string, unknown>, key: Buffer | null): { access?: string; refresh?: string } | null {
  const raw = val["cursor-accounts"] ?? val["cursorAccounts"] ?? val["cursor_accounts"];
  if (raw == null) return null;
  let inner: Record<string, unknown>;
  if (typeof raw === "string") {
    const normalized = normalizeSecret(raw);
    try {
      inner = JSON.parse(normalized) as Record<string, unknown>;
    } catch {
      try {
        inner = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  } else if (typeof raw === "object") inner = raw as Record<string, unknown>;
  else return null;
  const active = typeof inner["active"] === "string" ? (inner["active"] as string).trim() : "";
  if (!active) return null;
  const accounts = inner["accounts"] as Record<string, unknown> | undefined;
  if (!accounts || typeof accounts !== "object") return null;
  const acct = accounts[active] as Record<string, unknown> | undefined;
  if (!acct) return null;
  const accessRaw = jsonStr(acct, "cursor-access-token", "cursorAccessToken");
  const refreshRaw = jsonStr(acct, "cursor-refresh-token", "cursorRefreshToken");
  const access = accessRaw ? unwrapSecret(accessRaw, key) : undefined;
  const refresh = refreshRaw ? unwrapSecret(refreshRaw, key) : undefined;
  const a = access && looksLikeJwt(access) ? access : undefined;
  const r = refresh || undefined;
  if (!a && !r) return null;
  return { access: a, refresh: r };
}
function unwrapSecret(raw: string, key: Buffer | null): string | null {
  const trimmed = normalizeSecret(raw);
  if (!trimmed) return null;
  if (trimmed.startsWith("plaintext:v1:")) {
    const plain = trimmed.slice("plaintext:v1:".length).trim();
    return plain || null;
  }
  if (trimmed.startsWith("scoped:v1:")) {
    const parts = trimmed.split(":");
    const ciphertext = parts[parts.length - 1];
    if (!ciphertext) return null;
    return decryptSafeStorage(ciphertext, key);
  }
  if (looksLikeJwt(trimmed)) return trimmed;
  return decryptSafeStorage(trimmed, key);
}
function normalizeSecret(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  try {
    const parsed = JSON.parse(t);
    if (typeof parsed === "string") return parsed.trim();
  } catch {}
  if (t.startsWith('"') && t.endsWith('"') && t.length >= 2) return t.slice(1, -1).replace(/\\"/g, '"').trim();
  return t;
}
function sandSecretsPaths(): string[] {
  const home = homeDir();
  return [
    join(home, "Library/Application Support/Grok Bot/sand-secrets.json"),
    join(home, ".config/Grok Bot/sand-secrets.json"),
    join(home, ".grokbot/sand-secrets.json"),
    join(home, "Library/Application Support/Grok Bot/sand-client-persistence/sand-secrets.json"),
    join(home, ".config/Grok Bot/sand-client-persistence/sand-secrets.json"),
  ];
}
function decryptSafeStorage(b64: string, key: Buffer | null): string | null {
  if (!key) return null;
  let data: Buffer;
  try {
    data = Buffer.from(b64.trim(), "base64");
    if (data.length === 0) data = Buffer.from(b64.trim(), "base64url");
  } catch {
    return null;
  }
  if (!data.subarray(0, 3).equals(V10_PREFIX)) return null;
  data = data.subarray(3);
  if (data.length === 0 || data.length % 16 !== 0) return null;
  try {
    const iv = Buffer.alloc(16, 32); // 16 spaces
    const dec = createDecipheriv("aes-128-cbc", key, iv);
    dec.setAutoPadding(true);
    const out = Buffer.concat([dec.update(data), dec.final()]);
    const s = out.toString("utf8").trim();
    return s || null;
  } catch {
    return null;
  }
}
function cryptKey(): Buffer | null {
  if (cryptKeyCache) return cryptKeyCache;
  const secret = safeStorageSecret();
  if (!secret) return null;
  const key = pbkdf2Sync(secret, PBKDF2_SALT, PBKDF2_ITERS, 16, "sha1");
  cryptKeyCache = key;
  return key;
}
function safeStorageSecret(): Buffer | null {
  if (process.platform === "darwin") return macosSafeStorageSecret();
  return null;
}
function macosSafeStorageSecret(): Buffer | null {
  try {
    const { execSync } = require("node:child_process");
    const out = execSync(`security find-generic-password -s "Grok Bot Safe Storage" -a "Grok Bot Key" -w 2>/dev/null`, { encoding: "utf8" }).trim();
    if (out) return Buffer.from(out, "utf8");
  } catch {}
  return null;
}
