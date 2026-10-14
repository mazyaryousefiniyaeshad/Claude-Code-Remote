import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Screen } from "../../components/Screen";
import { Empty, ErrorNote, Loading, Section } from "../../components/Primitives";
import { StarButton } from "../../components/StarButton";
import { keys, stopRun, useFavorites, useProjects, useRuns } from "../../api/hooks";
import { ago, countLabel } from "../../lib/format";
import { directionOf } from "../../lib/direction";
import { RunCard } from "./RunCard";
import "./home.css";

export function HomeScreen() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const runs = useRuns(4000);
  const projects = useProjects();
  const favorites = useFavorites();

  const live = (runs.data ?? []).filter((run) => run.status === "running");
  const ordered = [...live].sort((a, b) => {
    const byPending = (b.pending.length > 0 ? 1 : 0) - (a.pending.length > 0 ? 1 : 0);
    return byPending !== 0 ? byPending : b.startedAt - a.startedAt;
  });

  const handleStop = async (runId: string) => {
    await stopRun(runId).catch(() => undefined);
    client.invalidateQueries({ queryKey: keys.runs });
  };

  return (
    <Screen
      title="Remote for Claude Code"
      actions={
        <>
          <button className="icon-btn" aria-label="Open ports" onClick={() => navigate("/ports")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18" />
              <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
            </svg>
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => navigate("/settings")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.3 19.7l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.3 14H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.3 7.3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.3V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.2 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
            </svg>
          </button>
        </>
      }
    >
      {ordered.length > 0 ? (
        <Section label={ordered.some((run) => run.pending.length > 0) ? "Waiting on you" : "Working now"}>
          <div className="stack">
            {ordered.map((run) => (
              <RunCard key={run.runId} run={run} onStop={handleStop} />
            ))}
          </div>
        </Section>
      ) : null}

      {favorites.data && favorites.data.length > 0 ? (
        <Section label="Starred">
          <div className="stack">
            {favorites.data.map((favorite) => (
              <div key={favorite.sessionId} className="fav-row">
                <button
                  className="row row-favorite"
                  onClick={() =>
                    navigate(`/chat?cwd=${encodeURIComponent(favorite.cwd)}&session=${favorite.sessionId}`)
                  }
                >
                  <span className="row-title" dir={directionOf(favorite.title)}>
                    {favorite.title}
                  </span>
                  <span className="row-path mono">{favorite.cwd}</span>
                </button>
                <StarButton
                  sessionId={favorite.sessionId}
                  cwd={favorite.cwd}
                  title={favorite.title}
                  starred
                />
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      <Section label="Projects">
        {projects.isLoading ? <Loading /> : null}
        {projects.error ? <ErrorNote message={(projects.error as Error).message} /> : null}
        {projects.data && projects.data.length === 0 ? (
          <Empty title="No projects yet" hint="Open a folder on the Mac and send Claude a message." />
        ) : null}
        <div className="stack">
          {(projects.data ?? []).map((project) => (
            <button
              key={project.slug}
              className="row row-project"
              onClick={() => navigate(`/sessions?cwd=${encodeURIComponent(project.cwd)}`)}
            >
              <span className="row-title">{project.name}</span>
              <span className="row-path mono">{project.cwd}</span>
              <span className="row-meta">
                {countLabel(project.sessionCount, "session")} · {ago(project.mtime)}
              </span>
            </button>
          ))}
        </div>
      </Section>
    </Screen>
  );
}
