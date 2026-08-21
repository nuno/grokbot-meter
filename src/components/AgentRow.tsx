import { memo, useMemo } from "react";
import type { GrokAgent } from "../types";
import { agentLabel, formatLastSeen } from "../lib/format";

type Props = {
  agent: GrokAgent;
};

function areAgentsEqual(prev: Readonly<Props>, next: Readonly<Props>): boolean {
  const a = prev.agent;
  const b = next.agent;
  return a.id === b.id && a.lastActivityAt === b.lastActivityAt && a.todayMessages === b.todayMessages && a.name === b.name && a.title === b.title;
}

export const AgentRow = memo(function AgentRow({ agent }: Props) {
  const label = agentLabel(agent);
  const timeLabel = useMemo(() => formatLastSeen(agent.lastActivityAt), [agent.lastActivityAt]);
  const hasActivity = agent.todayMessages > 0;

  return (
    <li className={`agent${hasActivity ? " has-activity" : ""}`}>
      <span className="agent-dot" aria-hidden="true" />
      <span className="agent-name" title={label}>
        {label}
      </span>
      <span className="agent-meta">
        {hasActivity ? <span className="agent-count">{agent.todayMessages}</span> : null}
        <span className="agent-time">{timeLabel}</span>
      </span>
    </li>
  );
}, areAgentsEqual);
