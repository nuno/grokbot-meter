import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { createDecipheriv, pbkdf2Sync } from "crypto";
import type { WeeklyStatus, OnDemandSpend } from "../shared/types";

export type { WeeklyStatus, OnDemandSpend };

const CACHE_TTL = 60_000;
const HTTP_TIMEOUT = 12_000;
const USAGE_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetSandUsageStatus";
const PERIOD_USAGE_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetCurrentPeriodUsage";
const ME_URL = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetMe";
const TOKEN_URL = "https://api2.cursor.sh/oauth/token";
const OAUTH_CLIENT_ID = "KbZUR41cY7W6zRSdpSUJ7I7mLYBKOCmB";
const SECOND_MS_THRESHOLD = 100_000_000_000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Grok Bot unlimited sentinel (`jy`) — Hde(limit) returns null at/above this. */
const UNLIMITED_SPEND_LIMIT = 2_147_483_647;
const PBKDF2_SALT = Buffer.from("saltysalt");
const PBKDF2_ITERS = 1003;
const V10_PREFIX = Buffer.from("v10");

const JWT_CHAR_RE = /^[A-Za-z0-9._\-+/=]+$/;
const LONG_TOKEN_RE = /^[A-Za-z0-9\-_\.+/=]+$/;
const SANITIZE_SPLIT_RE = /\s+/;
const QUOTE_TRIM_RE = /^["',]+|["',]+$/;

const TOKEN_EXPIRY_SKEW_MS = 60_000;
type RefreshResult = { kind: "access"; token: string } | { kind: "signedOut" } | { kind: "failed" };

let cache: { fetchedAt: number; status: WeeklyStatus } | null = null;
let cryptKeyCache: Buffer | null = null;
/** Access token we minted via refresh; only valid while Grok Bot still holds the same refresh token. */
let refreshedAccess: { token: string; refresh: string } | null = null;
let inFlight: Promise<WeeklyStatus> | null = null;

export async function getWeeklyStatusAsync(force = false): Promise<WeeklyStatus> {
  if (!force && cache && Date.now() - cache.fetchedAt < CACHE_TTL) return cache.status;
  if (inFlight) return inFlight;
  inFlight = fetchStatusAsync()
    .then((fresh) => {
      cache = { fetchedAt: Date.now(), status: fresh };
      return fresh;
    })
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
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
    onDemand: null,
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
  const tokens = loadTokens();
  const refresh = tokens.refresh?.trim() || null;
  const fileAccess = tokens.access?.trim();

  let access: string | null = null;
  if (fileAccess && looksLikeJwt(fileAccess) && !isExpired(fileAccess)) access = fileAccess;
  else if (refreshedAccess && refreshedAccess.refresh === refresh && !isExpired(refreshedAccess.token))
    access = refreshedAccess.token;
  else refreshedAccess = null;

  if (!access) {
    if (!refresh) return signedOut(null);
    const r = await refreshAndRemember(refresh);
    if (r.kind !== "access") return refreshFailureStatus(r);
    access = r.token;
  }

  const usage = await callUsage(access);
  if (usage.kind === "ok") return withAccountEmail(parseUsage(usage.value), access);
  if (usage.kind !== "unauthorized") return errStatus(true, usage.error);

  refreshedAccess = null;
  if (!refresh) return signedOut(null);
  const r = await refreshAndRemember(refresh);
  if (r.kind !== "access") return refreshFailureStatus(r);
  const retry = await callUsage(r.token);
  if (retry.kind === "ok") return withAccountEmail(parseUsage(retry.value), r.token);
  if (retry.kind === "unauthorized") return signedOut(null);
  return errStatus(true, retry.error);
}

async function refreshAndRemember(refresh: string): Promise<RefreshResult> {
  const r = await refreshAccess(refresh);
  refreshedAccess = r.kind === "access" ? { token: r.token, refresh } : null;
  return r;
}

function refreshFailureStatus(r: Exclude<RefreshResult, { kind: "access" }>): WeeklyStatus {
  if (r.kind === "signedOut") return signedOut(null);
  return errStatus(true, "network error");
}

async function withAccountEmail(status: WeeklyStatus, access: string): Promise<WeeklyStatus> {
  const [email, onDemand] = await Promise.all([fetchAccountEmail(access), fetchOnDemandSpend(access)]);
  status.accountEmail = email;
  status.onDemand = onDemand;
  return status;
}

async function callUsage(access: string): Promise<{ kind: "ok"; value: unknown } | { kind: "unauthorized" } | { kind: "failed"; error: string }> {
  return callDashboardJson(USAGE_URL, access, "usage");
}

/** Same Bearer + Connect-Protocol-Version headers as GetSandUsageStatus. */
async function callDashboardJson(
  url: string,
  access: string,
  label: string,
): Promise<{ kind: "ok"; value: unknown } | { kind: "unauthorized" } | { kind: "failed"; error: string }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
      },
      body: "{}",
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
    if (res.status === 401) return { kind: "unauthorized" };
    if (!res.ok) return { kind: "failed", error: `${label} request failed (HTTP ${res.status})` };
    const body = await res.text();
    try {
      return { kind: "ok", value: JSON.parse(body) };
    } catch {
      return { kind: "failed", error: `unexpected ${label} response` };
    }
  } catch {
    return { kind: "failed", error: "network error" };
  }
}

/** Fetch + parse on-demand; failures return null (weekly fields still valid). */
async function fetchOnDemandSpend(access: string): Promise<OnDemandSpend | null> {
  const period = await callDashboardJson(PERIOD_USAGE_URL, access, "period usage");
  if (period.kind !== "ok") return null;
  return parseOnDemandSpend(period.value);
}

/** Match Grok Bot Hde(limit): null if undefined, non-finite, <=0, or >= unlimited sentinel. */
function normalizeSpendLimitCents(limit: unknown): number | null {
  const n = typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n >= UNLIMITED_SPEND_LIMIT) return null;
  return n;
}

/**
 * Copy GetCurrentPeriodUsage.spendLimitUsage → OnDemandSpend.
 * Only when spendLimitUsage exists AND limitCents non-null; else null (hide UI).
 */
function parseOnDemandSpend(v: unknown): OnDemandSpend | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const spend = o["spendLimitUsage"] ?? o["spend_limit_usage"];
  if (!spend || typeof spend !== "object") return null;
  const s = spend as Record<string, unknown>;
  const usedRaw = jsonF64(s, "individualUsed", "individual_used");
  const usedCents = usedRaw ?? 0;
  if (!Number.isFinite(usedCents)) return null;
  const limitCents = normalizeSpendLimitCents(s["individualLimit"] ?? s["individual_limit"]);
  if (limitCents == null) return null;
  const resetTimestampMs = parseTimestampMs(o["billingCycleEnd"] ?? o["billing_cycle_end"]);
  return { usedCents, limitCents, resetTimestampMs };
}

async function fetchAccountEmail(access: string): Promise<string | null> {
  try {
    const res = await fetch(ME_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
      },
      body: "{}",
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
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

async function refreshAccess(refresh: string): Promise<RefreshResult> {
  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "refresh_token", client_id: OAUTH_CLIENT_ID, refresh_token: refresh }),
      signal: AbortSignal.timeout(HTTP_TIMEOUT),
    });
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

function parseRefreshJson(v: Record<string, unknown>, httpStatus: number): RefreshResult {
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
    onDemand: null,
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
  return JWT_CHAR_RE.test(t);
}
/** Unreadable `exp` counts as not expired so the server decides. */
function isExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as { exp?: unknown };
    if (typeof payload.exp !== "number") return false;
    return normalizeEpoch(payload.exp) - TOKEN_EXPIRY_SKEW_MS <= Date.now();
  } catch {
    return false;
  }
}
function sanitizeError(msg: string): string {
  const out: string[] = [];
  for (const raw of msg.split(SANITIZE_SPLIT_RE)) {
    const cleaned = raw.replace(QUOTE_TRIM_RE, "");
    const lower = cleaned.toLowerCase();
    if (
      looksLikeJwt(cleaned) ||
      lower.includes("bearer") ||
      lower.includes("authorization") ||
      (cleaned.length > 40 && LONG_TOKEN_RE.test(cleaned))
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
