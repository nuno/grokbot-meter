import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type GrokAgent = {
  id: string;
  name: string;
  title: string;
  lastActivityAt: number;
  todayMessages: number;
};

type GrokStatus = {
  found: boolean;
  paths: string[];
  agentCount: number;
  todayAgentCount: number;
  todayMessageCount: number;
  agents: GrokAgent[];
};

type WeeklyStatus = {
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

function persistencePath(paths: string[] | undefined): string {
  if (!paths?.length) return "—";
  return (
    paths.find((p) => p.includes("sand-client-persistence")) ?? paths[0] ?? "—"
  );
}

function formatLastSeen(ms: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "—";
  const now = new Date();
  const startToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startYesterday = startToday - 86_400_000;
  const time = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (ms >= startToday) return time;
  if (ms >= startYesterday) return "yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function agentLabel(agent: GrokAgent): string {
  const name = agent.name.trim();
  return name || agent.id;
}

function clampPercent(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

function formatResetsIn(nextResetAt: number | null | undefined): string {
  if (nextResetAt == null || !Number.isFinite(nextResetAt)) return "Resets in —";
  const ms = nextResetAt - Date.now();
  if (ms <= 0) return "Resets soon";
  const totalMinutes = Math.max(1, Math.round(ms / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remH = hours % 24;
    return remH > 0 ? `Resets in ${days}d ${remH}h` : `Resets in ${days}d`;
  }
  if (hours >= 1) return `Resets in ${hours}h`;
  return `Resets in ${totalMinutes}m`;
}

function weeklyLines(weekly: WeeklyStatus | null): string[] {
  if (!weekly) return ["Resets in —"];
  const hasPercent = typeof weekly.usagePercent === "number";
  if (hasPercent) {
    return [formatResetsIn(weekly.nextResetAt)];
  }
  if (!weekly.signedIn) {
    return ["Connect usage"];
  }
  if (weekly.error) {
    return [weekly.error];
  }
  const lines = ["No included weekly quota"];
  if (weekly.upgradeLabel) lines.push(weekly.upgradeLabel);
  return lines;
}

function App() {
  const [status, setStatus] = useState<GrokStatus | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      invoke<GrokStatus>("grok_status")
        .then((next) => {
          if (cancelled) return;
          setStatus(next);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
        });
      invoke<WeeklyStatus>("weekly_status")
        .then((next) => {
          if (cancelled) return;
          setWeekly(next);
        })
        .catch(() => {
          if (cancelled) return;
          setWeekly(null);
        });
    };
    load();
    const timer = window.setInterval(load, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const found = Boolean(status?.found);
  const path = persistencePath(status?.paths);
  const todayMessageCount = status?.todayMessageCount ?? 0;
  const todayAgentCount = status?.todayAgentCount ?? 0;
  const hasToday = todayMessageCount > 0 || todayAgentCount > 0;
  const agents = status?.agents ?? [];

  const hasPercent = typeof weekly?.usagePercent === "number";
  const meterPct = hasPercent ? clampPercent(weekly!.usagePercent as number) : 0;
  const pctLabel = hasPercent ? `${Math.round(meterPct)}%` : "—";
  const lines = weeklyLines(weekly);

  return (
    <div className="panel">
      <header className="header" data-tauri-drag-region>
        <h1 className="title" data-tauri-drag-region>
          GrokBar
        </h1>
      </header>

      <section className="card">
        <div className="card-head">
          <span className="card-label">Weekly</span>
          <span className="card-pct">{pctLabel}</span>
        </div>
        <div
          className={`meter${hasPercent ? "" : " is-empty"}`}
          role="meter"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={hasPercent ? meterPct : 0}
        >
          <div className="meter-fill" style={{ width: `${meterPct}%` }} />
        </div>
        {lines.map((line) => (
          <p key={line} className="muted">
            {line}
          </p>
        ))}
        {weekly?.accountEmail ? (
          <p className="muted">{weekly.accountEmail}</p>
        ) : null}
      </section>

      <section className="card card-today">
        <div className="card-head">
          <span className="card-label">Today</span>
          {hasToday ? (
            <span className="card-pct">{todayMessageCount}</span>
          ) : null}
        </div>
        {hasToday ? (
          <p className="muted">
            {todayMessageCount} message{todayMessageCount === 1 ? "" : "s"} ·{" "}
            {todayAgentCount} agent{todayAgentCount === 1 ? "" : "s"}
          </p>
        ) : (
          <p className="empty">No Grok Bot activity yet</p>
        )}
        {agents.length > 0 ? (
          <ul className="agents">
            {agents.map((agent) => (
              <li key={agent.id} className="agent">
                <span className="agent-name" title={agentLabel(agent)}>
                  {agentLabel(agent)}
                </span>
                <span className="agent-meta">
                  {agent.todayMessages > 0 ? (
                    <span className="agent-count">{agent.todayMessages}</span>
                  ) : null}
                  <span className="agent-time">
                    {formatLastSeen(agent.lastActivityAt)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
        <dl className="status">
          <div>
            <dt>found</dt>
            <dd>{status ? (found ? "yes" : "no") : "…"}</dd>
          </div>
          <div>
            <dt>path</dt>
            <dd className="path">{path}</dd>
          </div>
        </dl>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <footer className="footer">Local Grok Bot activity</footer>
    </div>
  );
}

export default App;
