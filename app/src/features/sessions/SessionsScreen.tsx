import { useNavigate, useSearchParams } from "react-router-dom";
import { Screen } from "../../components/Screen";
import { Empty, ErrorNote, Loading, StatusDot, Tag } from "../../components/Primitives";
import { useRuns, useSessions } from "../../api/hooks";
import { StarButton } from "../../components/StarButton";
import { ago, basename, countLabel } from "../../lib/format";
import { directionOf } from "../../lib/direction";
import "./sessions.css";

export function SessionsScreen() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cwd = params.get("cwd") ?? "";
  const sessions = useSessions(cwd);
  const runs = useRuns(0);

  const liveIds = new Set(
    (runs.data ?? []).filter((run) => run.status === "running" && run.sessionId).map((run) => run.sessionId),
  );

  return (
    <Screen
      title={basename(cwd)}
      subtitle={cwd}
      back="/"
      actions={
        <>
          <button
            className="icon-btn"
            aria-label="Browse files"
            onClick={() => navigate(`/files?path=${encodeURIComponent(cwd)}`)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            </svg>
          </button>
          <button className="icon-btn" aria-label="Refresh" onClick={() => sessions.refetch()}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-2.6-6.4" />
              <path d="M21 3v6h-6" />
            </svg>
          </button>
        </>
      }
    >
      <div className="session-list">
        <button className="new-session" onClick={() => navigate(`/chat?cwd=${encodeURIComponent(cwd)}`)}>
          <span aria-hidden="true">+</span> New session
        </button>

        {sessions.isLoading ? <Loading /> : null}
        {sessions.error ? <ErrorNote message={(sessions.error as Error).message} /> : null}
        {sessions.data?.length === 0 ? (
          <Empty title="No sessions here" hint="Start one and it will show up in this list." />
        ) : null}

        {(sessions.data ?? []).map((session) => (
          <div key={session.id} className="session-row">
            <button
              className="session-main"
              onClick={() => navigate(`/chat?cwd=${encodeURIComponent(cwd)}&session=${session.id}`)}
            >
              <span className="session-title" dir={directionOf(session.title)}>
                {session.title}
              </span>
              <span className="session-meta">
                {liveIds.has(session.id) ? (
                  <>
                    <StatusDot tone="working" />
                    <Tag tone="working">running</Tag>
                  </>
                ) : null}
                {countLabel(session.userCount, "message")} · {ago(session.mtime)}
              </span>
            </button>
            <StarButton
              sessionId={session.id}
              cwd={cwd}
              title={session.title}
              starred={Boolean(session.starred)}
            />
          </div>
        ))}
      </div>
    </Screen>
  );
}
