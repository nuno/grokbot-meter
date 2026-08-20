import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
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

function WeeklyIcon() {
  return (
    <svg className="card-label-icon weekly" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="1.5" y="7.5" width="2.5" height="5" rx="0.75" fill="currentColor" opacity="0.9" />
      <rect x="5.75" y="4.5" width="2.5" height="8" rx="0.75" fill="currentColor" />
      <rect x="10" y="1.5" width="2.5" height="11" rx="0.75" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function TodayIcon() {
  return (
    <svg className="card-label-icon today" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="5.25" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
      <path d="M7 4.2V7l2.2 1.3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="1.15" fill="currentColor" opacity="0.9" />
    </svg>
  );
}

function GrokMark2Icon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 18 18"
      width="18"
      height="18"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        fill="currentColor"
        d="M9 1.65 C4.94 1.65 1.65 4.94 1.65 9 C1.65 13.06 4.94 16.35 9 16.35 C13.06 16.35 16.35 13.06 16.35 9 C16.35 4.94 13.06 1.65 9 1.65Z M6.02 5.05 C6.43 4.86 6.79 5.08 6.97 5.52 L7.76 7.45 C7.94 7.89 7.75 8.28 7.35 8.37 C6.94 8.45 6.62 8.17 6.44 7.74 L5.67 5.84 C5.49 5.41 5.61 5.24 6.02 5.05Z M10.62 4.36 C11.03 4.21 11.38 4.46 11.55 4.89 L12.34 6.82 C12.52 7.27 12.33 7.63 11.93 7.72 C11.53 7.80 11.21 7.52 11.04 7.10 L10.28 5.20 C10.11 4.77 10.21 4.51 10.62 4.36Z"
      />
    </svg>
  );
}

function App() {
  const [status, setStatus] = useState<GrokStatus | null>(null);
  const [weekly, setWeekly] = useState<WeeklyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [about, setAbout] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let polling = false;
    const win = getCurrentWindow();

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

    const stopPolling = () => {
      if (timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
      }
      polling = false;
    };

    const startPolling = () => {
      if (timer !== undefined) return;
      timer = window.setInterval(load, 15_000);
      polling = true;
    };

    const applyVisible = (visible: boolean) => {
      if (cancelled) return;
      if (visible) {
        if (!polling) {
          load();
          startPolling();
        }
      } else {
        stopPolling();
        setAbout(false);
      }
    };

    const syncVisible = () => {
      win
        .isVisible()
        .then((visible) => applyVisible(visible))
        .catch(() => {});
    };

    load();
    syncVisible();

    const unlistenFocus = win
      .onFocusChanged(() => {
        syncVisible();
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      stopPolling();
      void unlistenFocus.then((fn) => fn?.());
    };
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen("show-about", () => setAbout(true))
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});
    return () => {
      unlisten?.();
    };
  }, []);

  const todayMessageCount = status?.todayMessageCount ?? 0;
  const todayAgentCount = status?.todayAgentCount ?? 0;
  const hasToday = todayMessageCount > 0 || todayAgentCount > 0;
  const agents = status?.agents ?? [];

  const hasPercent = typeof weekly?.usagePercent === "number";
  const meterPct = hasPercent ? clampPercent(weekly!.usagePercent as number) : 0;
  const pctLabel = hasPercent ? `${Math.round(meterPct)}%` : "—";
  const lines = weeklyLines(weekly);

  if (about) {
    return (
      <div className="panel">
        <header className="header header-row">
          <button type="button" className="back" onClick={() => setAbout(false)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M7.5 9L4.5 6 7.5 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>
        </header>
        <section className="card about">
          <div className="about-header">
            <div className="about-icon" aria-hidden="true">
              <GrokMark2Icon className="about-mark" />
            </div>
            <div className="about-titleblock">
              <h2>Grok Bot Bar</h2>
              <p className="tagline">Menu bar stats for Grok Bot.</p>
            </div>
          </div>
          <div className="about-divider" role="separator" />
          <div className="about-body">
            <p>
              Unofficial companion app. Not affiliated with, endorsed by, or a
              product of Cursor or xAI.
            </p>
            <p className="legal">
              Grok Bot and Cursor are trademarks of their respective owners.
            </p>
          </div>
          <div className="about-divider" role="separator" />
          <div className="about-footer">
            <p>Built by Grok Bot.</p>
            <p className="legal">© 2026 Nuno Costa</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="panel">
      <header className="header">
        <h1 className="title">
          <GrokMark2Icon className="title-icon" />
          Grok Bot Bar
        </h1>
      </header>

      <section className="card">
        <div className="card-head">
          <span className="card-label">
            <WeeklyIcon /> Weekly
          </span>
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
          <span className="card-label">
            <TodayIcon /> Today
          </span>
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
              <li key={agent.id} className={`agent${agent.todayMessages > 0 ? " has-activity" : ""}`}>
                <span className="agent-dot" aria-hidden="true" />
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
        {error ? <p className="error">{error}</p> : null}
      </section>

      <footer className="footer footer-row">
        <span>Local Grok Bot activity</span>
        <button type="button" className="footer-btn" onClick={() => setAbout(true)}>
          About
        </button>
      </footer>
    </div>
  );
}

export default App;
