import { readdirSync, readFileSync, statSync } from "fs";
import { join, basename } from "path";
import { homedir } from "os";

const MAX_BLOB_BYTES = 8 * 1024 * 1024;
const SECOND_MS_THRESHOLD = 100_000_000_000;

export type GrokAgent = { id: string; name: string; title: string; lastActivityAt: number; todayMessages: number };
export type GrokStatus = {
  found: boolean;
  paths: string[];
  agentCount: number;
  todayAgentCount: number;
  todayMessageCount: number;
  agents: GrokAgent[];
};

export function candidateDirs(): string[] {
  const home = homedir();
  return [
    join(home, "Library/Application Support/Grok Bot/sand-client-persistence"),
    join(home, ".config/Grok Bot/sand-client-persistence"),
    join(home, ".grokbot"),
  ];
}
function isPersistenceDir(p: string): boolean {
  return p.endsWith("sand-client-persistence");
}
export function getGrokStatus(): GrokStatus {
  const paths: string[] = [];
  let persistenceExists = false;
  const agents = new Map<string, GrokAgent>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const isToday = (ms: number) => {
    const d = new Date(ms);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === todayStart;
  };
  for (const dir of candidateDirs()) {
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    if (isPersistenceDir(dir)) persistenceExists = true;
    paths.push(dir);
    ingestDir(dir, agents, isToday);
  }
  const list = [...agents.values()].sort((a, b) => {
    if (b.lastActivityAt !== a.lastActivityAt) return b.lastActivityAt - a.lastActivityAt;
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.id.localeCompare(b.id);
  });
  const todayMessageCount = list.reduce((s, a) => s + a.todayMessages, 0);
  const todayAgentCount = list.filter((a) => a.todayMessages > 0).length;
  return {
    found: persistenceExists || list.length > 0,
    paths,
    agentCount: list.length,
    todayAgentCount,
    todayMessageCount,
    agents: list,
  };
}
function ingestDir(dir: string, agents: Map<string, GrokAgent>, isToday: (ms: number) => boolean) {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (!name.endsWith(".blob")) continue;
    ingestBlob(join(dir, name), agents, isToday);
  }
}
function ingestBlob(path: string, agents: Map<string, GrokAgent>, isToday: (ms: number) => boolean) {
  let st;
  try {
    st = statSync(path);
  } catch {
    return;
  }
  if (!st.isFile() || st.size > MAX_BLOB_BYTES) return;
  const stem = basename(path, ".blob");
  const key = decodeBase32Utf8(stem);
  if (!key) return;
  const isRoster = key.includes(".roster.last-roster");
  const tid = key.split(".transcript.replicas.")[1]?.trim();
  if (!isRoster && !tid) return;
  let buf: Buffer;
  try {
    buf = readFileSync(path);
  } catch {
    return;
  }
  let val: unknown;
  try {
    val = JSON.parse(buf.toString("utf8"));
  } catch {
    return;
  }
  if (isRoster) applyRoster(val, agents);
  if (tid) applyTranscript(tid, val, agents, isToday);
}
function applyRoster(root: unknown, agents: Map<string, GrokAgent>) {
  const rows = (root as { value?: { rows?: unknown[] } })?.value?.rows;
  if (!Array.isArray(rows)) return;
  for (const r of rows as Array<Record<string, unknown>>) {
    const id = typeof r["id"] === "string" ? r["id"] : "";
    if (!id) continue;
    const name = typeof r["name"] === "string" ? (r["name"] as string) : "";
    const title = typeof r["title"] === "string" ? (r["title"] as string) : "";
    const last = jsonI64(r["lastActivityAt"]) ?? jsonI64(r["updatedAt"]) ?? jsonI64(r["createdAt"]);
    const norm = last != null ? normalizeTs(last) : 0;
    let e = agents.get(id);
    if (!e) {
      e = { id, name: "", title: "", lastActivityAt: 0, todayMessages: 0 };
      agents.set(id, e);
    }
    if (name) e.name = name;
    if (title) e.title = title;
    if (norm > e.lastActivityAt) e.lastActivityAt = norm;
  }
}
function applyTranscript(agentId: string, root: unknown, agents: Map<string, GrokAgent>, isToday: (ms: number) => boolean) {
  const v = (root as { value?: unknown })?.value ?? root;
  const entries = (v as { entries?: unknown[] })?.entries;
  let todayMessages = 0;
  let latest = 0;
  if (Array.isArray(entries)) {
    for (const e of entries as Array<Record<string, unknown>>) {
      if (e["kind"] !== "message") continue;
      const tsRaw = jsonI64(e["timestampMs"]) ?? jsonI64(e["timestamp"]);
      if (tsRaw == null) continue;
      const ts = normalizeTs(tsRaw);
      if (ts > latest) latest = ts;
      if (isToday(ts)) todayMessages++;
    }
  }
  if (todayMessages === 0 && latest === 0 && !agents.has(agentId)) return;
  let entry = agents.get(agentId);
  if (!entry) {
    entry = { id: agentId, name: "", title: "", lastActivityAt: 0, todayMessages: 0 };
    agents.set(agentId, entry);
  }
  entry.todayMessages += todayMessages;
  if (latest > entry.lastActivityAt) entry.lastActivityAt = latest;
}
function jsonI64(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  }
  return null;
}
function normalizeTs(ts: number): number {
  if (ts > 0 && ts < SECOND_MS_THRESHOLD) return ts * 1000;
  return ts;
}
function decodeBase32(input: string): Uint8Array | null {
  let buf = 0;
  let bits = 0;
  const out: number[] = [];
  for (const ch of input) {
    if (ch === "=") continue;
    let v: number;
    if (ch >= "A" && ch <= "Z") v = ch.charCodeAt(0) - 65;
    else if (ch >= "a" && ch <= "z") v = ch.charCodeAt(0) - 97;
    else if (ch >= "2" && ch <= "7") v = 26 + (ch.charCodeAt(0) - 50);
    else return null;
    buf = (buf << 5) | v;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      out.push((buf >> bits) & 0xff);
      buf &= (1 << bits) - 1;
    }
  }
  return new Uint8Array(out);
}
function decodeBase32Utf8(input: string): string | null {
  const b = decodeBase32(input);
  if (!b) return null;
  try {
    return new TextDecoder().decode(b);
  } catch {
    return null;
  }
}
