import { useEffect, useState } from "react";
import { Popup } from "antd-mobile";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useRuns } from "../api/hooks";
import { basename, elapsed } from "../lib/format";
import { StatusDot, Tag } from "./Primitives";
import { directionOf } from "../lib/direction";
import "./LiveSwitcher.css";

export function LiveSwitcher() {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const currentSession = params.get("session");
  const runs = useRuns(open ? 4000 : 8000);

  const live = (runs.data ?? []).filter((run) => run.status === "running");
  const waiting = live.filter((run) => run.pending.length > 0).length;

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [open]);

  if (live.length === 0) return null;

  const ordered = [...live].sort((a, b) => {
    const byPending = (b.pending.length > 0 ? 1 : 0) - (a.pending.length > 0 ? 1 : 0);
    return byPending !== 0 ? byPending : b.startedAt - a.startedAt;
  });

  return (
    <>
      <button
        className={`switcher${waiting ? " is-waiting" : ""}`}
        onClick={() => setOpen(true)}
        aria-label={`${live.length} running${waiting ? `, ${waiting} waiting for you` : ""}`}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l9 5-9 5-9-5 9-5z" />
          <path d="M3 13l9 5 9-5" />
        </svg>
        <span className="switcher-count num">{live.length}</span>
      </button>

      <Popup visible={open} onMaskClick={() => setOpen(false)} bodyClassName="sheet">
        <div className="sheet-inner">
          <h2 className="sheet-title">Running now</h2>
          {ordered.map((run) => {
            const isCurrent = Boolean(currentSession) && run.sessionId === currentSession;
            return (
              <button
                key={run.runId}
                className={`live-row${run.pending.length ? " is-waiting" : ""}`}
                onClick={() => {
                  setOpen(false);
                  navigate(
                    `/chat?cwd=${encodeURIComponent(run.cwd)}&session=${run.sessionId ?? ""}&run=${run.runId}`,
                  );
                }}
              >
                <div className="live-top">
                  <StatusDot tone={run.pending.length ? "waiting" : "working"} />
                  <span className="live-place">{basename(run.cwd)}</span>
                  {run.pending.length ? <Tag tone="waiting">needs you</Tag> : null}
                  {isCurrent ? <span className="live-here">open</span> : null}
                  <span className="live-clock num">{elapsed(run.startedAt)}</span>
                </div>
                <p className="live-prompt" dir={directionOf(run.prompt)} style={{ unicodeBidi: "plaintext" }}>
                  {run.prompt}
                </p>
              </button>
            );
          })}
        </div>
      </Popup>
    </>
  );
}
