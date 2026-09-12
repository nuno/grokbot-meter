import { memo, useCallback, useEffect, useRef } from "react";
import type { GrokAgent } from "../types";
import { TodayIcon } from "./icons";
import { AgentRow } from "./AgentRow";
import { EMPTY_AGENTS } from "../lib/grok";

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
  const hasToday = todayMessageCount > 0 || todayAgentCount > 0;
  const isEmpty = !isLoading && !hasToday;
  const hasRecent = isEmpty && agents.length > 0;
  const listRef = useRef<HTMLUListElement>(null);
  const scrollTimer = useRef(0);

  const onAgentsScroll = useCallback(() => {
    const el = listRef.current;
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
          <p className="empty-state-caption">
            {hasRecent ? "No messages today — recent below" : "Messages will appear here"}
          </p>
        </div>
      ) : (
        <p className="muted">
          {todayMessageCount} message{todayMessageCount === 1 ? "" : "s"} · {todayAgentCount} agent{todayAgentCount === 1 ? "" : "s"}
        </p>
      )}
      {hasRecent ? <div className="empty-separator" role="separator" /> : null}
      {agents.length > 0 ? (
        <ul
          ref={listRef}
          className="agents"
          aria-label={hasRecent ? "Recent sessions" : undefined}
          onScroll={onAgentsScroll}
        >
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </ul>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
});
