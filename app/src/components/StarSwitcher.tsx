import { useState } from "react";
import { Popup } from "antd-mobile";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFavorites, useRuns } from "../api/hooks";
import { ago, basename } from "../lib/format";
import { directionOf } from "../lib/direction";
import { StatusDot, Tag } from "./Primitives";
import { StarButton } from "./StarButton";
import "./StarSwitcher.css";

export function StarSwitcher() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const current = params.get("session");
  const favorites = useFavorites();
  const runs = useRuns(0);

  const items = favorites.data ?? [];
  if (items.length === 0) return null;

  const liveIds = new Set(
    (runs.data ?? [])
      .filter((run) => run.status === "running" && run.sessionId)
      .map((run) => run.sessionId as string),
  );

  return (
    <>
      <button
        className="starswitch"
        onClick={() => setOpen(true)}
        aria-label={`Starred sessions, ${items.length}`}
        aria-haspopup="dialog"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" />
        </svg>
      </button>

      <Popup visible={open} onMaskClick={() => setOpen(false)} bodyClassName="sheet">
        <div className="sheet-inner">
          <h2 className="sheet-title">Starred sessions</h2>
          {items.map((favorite) => {
            const here = current === favorite.sessionId;
            const running = liveIds.has(favorite.sessionId);
            return (
              <div key={favorite.sessionId} className={`fav-jump${here ? " is-here" : ""}`}>
                <button
                  className="fav-jump-main"
                  onClick={() => {
                    setOpen(false);
                    navigate(
                      `/chat?cwd=${encodeURIComponent(favorite.cwd)}&session=${favorite.sessionId}`,
                    );
                  }}
                >
                  <span className="fav-jump-top">
                    {running ? <StatusDot tone="working" /> : null}
                    <span className="fav-jump-title" dir={directionOf(favorite.title)}>
                      {favorite.title}
                    </span>
                    {here ? <Tag tone="idle">open</Tag> : null}
                  </span>
                  <span className="fav-jump-meta mono">
                    {basename(favorite.cwd)} · starred {ago(favorite.starredAt)}
                  </span>
                </button>
                <StarButton
                  sessionId={favorite.sessionId}
                  cwd={favorite.cwd}
                  title={favorite.title}
                  starred
                />
              </div>
            );
          })}
        </div>
      </Popup>
    </>
  );
}
