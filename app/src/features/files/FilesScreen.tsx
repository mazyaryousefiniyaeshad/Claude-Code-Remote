import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Toast } from "antd-mobile";
import { Screen } from "../../components/Screen";
import { Empty, ErrorNote, Loading } from "../../components/Primitives";
import { useDirectory } from "../../api/hooks";
import { fileSize } from "../../lib/format";
import "./files.css";

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  Toast.show({ content: "Path copied", position: "bottom" });
}

export function FilesScreen() {
  const [params] = useSearchParams();
  const [path, setPath] = useState(params.get("path") ?? "~");
  const listing = useDirectory(path);

  return (
    <Screen
      title="Files"
      subtitle="Tap a file to copy its path"
      back
      actions={
        <button className="icon-btn" aria-label="Copy current folder" onClick={() => copy(listing.data?.path ?? path)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        </button>
      }
    >
      <p className="crumb">{listing.data?.path ?? path}</p>

      {listing.isLoading ? <Loading /> : null}
      {listing.error ? <ErrorNote message={(listing.error as Error).message} /> : null}

      {listing.data?.parent ? (
        <button className="file-row" onClick={() => setPath(listing.data.parent as string)}>
          <svg className="file-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          <span className="file-name">..</span>
        </button>
      ) : null}

      {listing.data?.items.length === 0 ? <Empty title="Empty folder" /> : null}

      {(listing.data?.items ?? []).map((entry) => (
        <button
          key={entry.path}
          className="file-row"
          onClick={() => (entry.dir ? setPath(entry.path) : copy(entry.path))}
        >
          <svg className="file-icon" viewBox="0 0 24 24" aria-hidden="true">
            {entry.dir ? (
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            ) : (
              <>
                <path d="M14 3v5h5" />
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              </>
            )}
          </svg>
          <span className="file-name">{entry.name}</span>
          <span className="file-size num">{entry.dir ? "" : fileSize(entry.size)}</span>
          <span
            className="file-copy"
            role="button"
            aria-label={`Copy path of ${entry.name}`}
            onClick={(event) => {
              event.stopPropagation();
              copy(entry.path);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <rect x="9" y="9" width="12" height="12" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          </span>
        </button>
      ))}
    </Screen>
  );
}
