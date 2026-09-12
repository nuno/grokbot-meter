/** Fixture checks for GetCurrentPeriodUsage → OnDemandSpend (Grok Bot Hde rules). */
const UNLIMITED = 2_147_483_647;
const SECOND_MS_THRESHOLD = 100_000_000_000;

function normalizeEpoch(n) {
  return Math.abs(n) >= SECOND_MS_THRESHOLD ? n : n * 1000;
}
function parseTimestampMs(v) {
  if (typeof v === "string") {
    const t = Date.parse(v);
    if (Number.isFinite(t)) return t;
    const n = Number(v);
    return Number.isFinite(n) ? normalizeEpoch(n) : null;
  }
  if (typeof v === "number") return normalizeEpoch(v);
  return null;
}
function jsonF64(v, camel, snake) {
  const x = v[camel] ?? v[snake];
  if (typeof x === "number") return x;
  if (typeof x === "string") {
    const n = Number(x);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
function Hde(limit) {
  const n = typeof limit === "number" ? limit : typeof limit === "string" ? Number(limit) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n >= UNLIMITED) return null;
  return n;
}
function parseOnDemandSpend(v) {
  if (!v || typeof v !== "object") return null;
  const spend = v.spendLimitUsage ?? v.spend_limit_usage;
  if (!spend || typeof spend !== "object") return null;
  const usedRaw = jsonF64(spend, "individualUsed", "individual_used");
  const usedCents = usedRaw ?? 0;
  if (!Number.isFinite(usedCents)) return null;
  const limitCents = Hde(spend.individualLimit ?? spend.individual_limit);
  if (limitCents == null) return null;
  const resetTimestampMs = parseTimestampMs(v.billingCycleEnd ?? v.billing_cycle_end);
  return { usedCents, limitCents, resetTimestampMs };
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Happy path (camel)
{
  const r = parseOnDemandSpend({
    spendLimitUsage: { individualUsed: 1234, individualLimit: 5000 },
    billingCycleEnd: 1735689600,
  });
  assert(r && r.usedCents === 1234 && r.limitCents === 5000, "camel used/limit");
  assert(r.resetTimestampMs === 1735689600 * 1000, "epoch sec → ms");
}
// Snake + ms epoch
{
  const r = parseOnDemandSpend({
    spend_limit_usage: { individual_used: 0, individual_limit: 10000 },
    billing_cycle_end: 1_735_689_600_000,
  });
  assert(r && r.usedCents === 0 && r.limitCents === 10000, "snake + zero used");
  assert(r.resetTimestampMs === 1_735_689_600_000, "epoch ms unchanged");
}
// Hide: missing spendLimitUsage
assert(parseOnDemandSpend({}) === null, "no spend → null");
// Hide: unlimited sentinel
assert(
  parseOnDemandSpend({ spendLimitUsage: { individualUsed: 1, individualLimit: UNLIMITED } }) === null,
  "unlimited → null",
);
assert(
  parseOnDemandSpend({ spendLimitUsage: { individualUsed: 1, individualLimit: 0 } }) === null,
  "limit<=0 → null",
);
assert(
  parseOnDemandSpend({ spendLimitUsage: { individualUsed: 1, individualLimit: -5 } }) === null,
  "negative limit → null",
);
// Do not invent weekly $ from plan_usage
assert(
  parseOnDemandSpend({ plan_usage: { included: 99 }, spendLimitUsage: null }) === null,
  "plan_usage alone → null",
);

console.log("ok: ondemand parse fixtures");
