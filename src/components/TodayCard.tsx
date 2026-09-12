import { memo, useCallback, useEffect, useRef } from "react";
import type { GrokAgent } from "../types";
import { TodayIcon } from "./icons";
import { AgentRow } from "./AgentRow";
import {
  EMPTY_AGENTS,
  calmTodayError,
  selectRecentAgents,
  selectTodayAgents,
} from "../lib/grok";

type Props = {
  agents?: readonly GrokAgent[];
  todayMessageCount: number;
  todayAgentCount: number;
  isLoading: boolean;
  error: string | null;
};

export const TodayCard = memo(function TodayCard({
  agents = EMPTY_AGENTS,
  todayMessageCount,
  todayAgentCount,
  isLoading,
  error,
}: Props) {
  const todayAgents = selectTodayAgents(agents);
  const recentAgents = selectRecentAgents(agents);
  const hasToday = todayMessageCount > 0 || todayAgentCount > 0;
  const isEmpty = !isLoading && !hasToday;
  // Show Recent whenever older agents exist — including under an active Today list.
  const hasRecent = recentAgents.length > 0;
  const calmError = calmTodayError(error);
  const stackRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef(0);

  const onStackScroll = useCallback(() => {
    const el = stackRef.current;
    if (!el) return;
    el.classList.add("is-scrolling");
    window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      el.classList.remove("is-scrolling");
    }, 700);
  }, []);

  useEffect(() => () => window.clearTimeout(scrollTimer.current), []);

  return (
    <section className={`card card-today${hasRecent ? " has-recent" : ""}`}>
      <div className="card-head">
        <span className="card-label">
          <TodayIcon /> Today
        </span>
        {hasToday ? <span className="card-pct">{todayMessageCount}</span> : null}
      </div>
      {isLoading ? (
        <div className="empty-state is-loading" aria-busy="true">
          <p className="empty-state-title">Loading…</p>
        </div>
      ) : isEmpty ? (
        <div className="empty-state">
          <p className="empty-state-title">No activity today</p>
          {!hasRecent ? (
            <p className="empty-state-caption">Messages will appear here</p>
          ) : null}
        </div>
      ) : (
        <p className="muted">
          {todayMessageCount} message{todayMessageCount === 1 ? "" : "s"} · {todayAgentCount} agent
          {todayAgentCount === 1 ? "" : "s"}
        </p>
      )}
      {hasToday || hasRecent ? (
        <div
          ref={stackRef}
          className="agent-stack"
          onScroll={onStackScroll}
        >
          {hasToday && todayAgents.length > 0 ? (
            <ul className="agents" aria-label="Today activity">
              {todayAgents.map((agent) => (
                <AgentRow key={agent.id} agent={agent} />
              ))}
            </ul>
          ) : null}
          {hasRecent ? (
            <>
              {hasToday ? <div className="empty-separator" role="separator" /> : null}
              {!hasToday ? <div className="empty-separator" role="separator" /> : null}
              <p className="recent-label">Recent</p>
              <ul className="agents" aria-label="Recent sessions">
                {recentAgents.map((agent) => (
                  <AgentRow key={agent.id} agent={agent} />
                ))}
              </ul>
            </>
          ) : null}
        </div>
      ) : null}
      {calmError ? <p className="error">{calmError}</p> : null}
    </section>
  );
});
