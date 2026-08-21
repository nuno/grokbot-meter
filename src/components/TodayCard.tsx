import { memo } from "react";
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
        <ul className="agents" aria-label={hasRecent ? "Recent sessions" : undefined}>
          {agents.map((agent) => (
            <AgentRow key={agent.id} agent={agent} />
          ))}
        </ul>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
});
