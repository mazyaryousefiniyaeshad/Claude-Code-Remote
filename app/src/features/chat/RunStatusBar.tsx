import { useEffect, useState } from "react";
import { elapsed } from "../../lib/format";
import { StatusDot } from "../../components/Primitives";

interface Props {
  startedAt: number;
  lastEventAt: number;
  waiting: boolean;
  onStop: () => void;
}

export function RunStatusBar({ startedAt, lastEventAt, waiting, onStop }: Props) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => tick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const quiet = lastEventAt ? Math.floor((Date.now() - lastEventAt) / 1000) : 0;

  return (
    <div className={`run-bar${waiting ? " is-waiting" : ""}`} role="status">
      <StatusDot tone={waiting ? "waiting" : "working"} />
      <span className="run-bar-text">
        {waiting ? "Claude is asking you something" : "Working"}
      </span>
      {!waiting ? (
        <span className="run-bar-clock num">
          {elapsed(startedAt)}
          {quiet > 5 ? ` · quiet ${quiet}s` : ""}
        </span>
      ) : null}
      <button className="run-bar-stop" onClick={onStop}>
        Stop
      </button>
    </div>
  );
}
