import { useEffect, useState } from "react";
import "./App.css";

// Tauri API replaced by Electron preload — window.api
declare global {
  interface Window {
    api?: {
      grokStatus: () => Promise<GrokStatus>;
      weeklyStatus: () => Promise<WeeklyStatus>;
      isVisible: () => Promise<boolean>;
      onShowAbout: (cb: () => void) => () => void;
      onFocusChanged: (cb: (visible: boolean) => void) => () => void;
    };
  }
}

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
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="10.5" cy="13.5" r="8" fill="currentColor" />
      <line x1="16" y1="6.5" x2="21" y2="2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="2" r="2" fill="currentColor" />
      <rect x="7.5" y="11" width="2.2" height="5" rx="1.1" fill="var(--panel-bg, #fff)" transform="rotate(8 8.6 13.5)" />
      <rect x="11.5" y="11" width="2.2" height="5" rx="1.1" fill="var(--panel-bg, #fff)" transform="rotate(-8 12.6 13.5)" />
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

    const api = window.api;

    const load = () => {
      const grokPromise = api ? api.grokStatus() : Promise.reject(new Error("API unavailable"));
      grokPromise
        .then((next) => {
          if (cancelled) return;
          setStatus(next);
          setError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : String(err));
        });
      const weeklyPromise = api ? api.weeklyStatus() : Promise.reject(new Error("API unavailable"));
      weeklyPromise
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
      if (api?.isVisible) {
        api
          .isVisible()
          .then((visible) => applyVisible(visible))
          .catch(() => {});
      } else {
        applyVisible(true);
      }
    };

    load();
    syncVisible();

    const unlistenFocus = api?.onFocusChanged
      ? api.onFocusChanged(() => syncVisible())
      : undefined;

    return () => {
      cancelled = true;
      stopPolling();
      unlistenFocus?.();
    };
  }, []);

  useEffect(() => {
    const unlisten = window.api?.onShowAbout(() => setAbout(true));
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
