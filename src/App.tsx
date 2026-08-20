import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type GrokStatus = {
  found: boolean;
  paths: string[];
  agentCount: number;
};

function App() {
  const [status, setStatus] = useState<GrokStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    invoke<GrokStatus>("grok_status")
      .then((next) => {
        setStatus(next);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, []);

  const found = Boolean(status?.found);
  const path = status?.paths?.[0] ?? "—";
  const agentCount = status?.agentCount ?? 0;

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
          <span className="card-pct">—</span>
        </div>
        <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
          <div className="meter-fill" />
        </div>
        <p className="muted">Resets in —</p>
      </section>

      <section className="card">
        <div className="card-head">
          <span className="card-label">Today</span>
        </div>
        {!found ? (
          <p className="empty">No Grok Bot activity yet</p>
        ) : (
          <p className="empty">{agentCount} agent{agentCount === 1 ? "" : "s"} on disk</p>
        )}
        <dl className="status">
          <div>
            <dt>found</dt>
            <dd>{status ? (found ? "yes" : "no") : "…"}</dd>
          </div>
          <div>
            <dt>path</dt>
            <dd className="path">{path}</dd>
          </div>
          <div>
            <dt>agentCount</dt>
            <dd>{status ? agentCount : "…"}</dd>
          </div>
        </dl>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <footer className="footer">Local data from ~/.grokbot</footer>
    </div>
  );
}

export default App;
