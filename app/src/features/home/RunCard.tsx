import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Run } from "../../api/types";
import { StatusDot, Tag, Bidi } from "../../components/Primitives";
import { basename, elapsed } from "../../lib/format";

export function RunCard({ run, onStop }: { run: Run; onStop: (runId: string) => void }) {
  const navigate = useNavigate();
  const [clock, setClock] = useState(() => elapsed(run.startedAt));
  const waiting = run.pending.length > 0;

  useEffect(() => {
    const id = window.setInterval(() => setClock(elapsed(run.startedAt)), 1000);
    return () => window.clearInterval(id);
  }, [run.startedAt]);

  const open = () =>
    navigate(`/chat?cwd=${encodeURIComponent(run.cwd)}&session=${run.sessionId ?? ""}&run=${run.runId}`);

  return (
    <article className={`run-card${waiting ? " is-waiting" : ""}`}>
      <button className="run-main" onClick={open}>
        <div className="run-top">
          <StatusDot tone={waiting ? "waiting" : "working"} />
          <span className="run-place">{basename(run.cwd)}</span>
          {waiting ? <Tag tone="waiting">needs you</Tag> : null}
          <span className="run-clock num">{clock}</span>
        </div>
        <Bidi as="p" className="run-prompt" text={run.prompt} />
      </button>
      <button className="run-stop" onClick={() => onStop(run.runId)}>
        Stop
      </button>
    </article>
  );
}
