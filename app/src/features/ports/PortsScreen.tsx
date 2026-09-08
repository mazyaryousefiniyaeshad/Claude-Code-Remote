import { Screen } from "../../components/Screen";
import { Empty, ErrorNote, Loading } from "../../components/Primitives";
import { usePorts } from "../../api/hooks";
import "./ports.css";

export function PortsScreen() {
  const ports = usePorts(true);
  const host = window.location.hostname;

  return (
    <Screen
      title="Ports"
      subtitle={host}
      back
      actions={
        <button className="icon-btn" aria-label="Refresh" onClick={() => ports.refetch()}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-2.6-6.4" />
            <path d="M21 3v6h-6" />
          </svg>
        </button>
      }
    >
      {ports.isLoading ? <Loading /> : null}
      {ports.error ? <ErrorNote message={(ports.error as Error).message} /> : null}
      {ports.data?.ports.length === 0 ? <Empty title="Nothing is listening" /> : null}

      {(ports.data?.ports ?? []).map((entry) => (
        <div key={`${entry.port}-${entry.pid}`} className="port-row">
          <span className="port-num num">{entry.port}</span>
          <span className="port-who">
            {entry.command} · {entry.hosts.join(" ")}
          </span>
          {entry.wildcard ? (
            <a className="port-open" href={`http://${host}:${entry.port}`} target="_blank" rel="noopener">
              Open
            </a>
          ) : (
            <span className="port-local">local only</span>
          )}
        </div>
      ))}

      <p className="port-note">
        Ports marked <em>local only</em> are not reachable from this device. The server must bind to
        0.0.0.0.
      </p>
    </Screen>
  );
}
