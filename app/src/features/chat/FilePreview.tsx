import { useEffect, useState } from "react";
import { Mask, Toast } from "antd-mobile";
import { api } from "../../api/client";
import { Thumb } from "../../components/Thumb";
import type { Attachment } from "../../api/types";
import { basename } from "../../lib/format";
import "./preview.css";

const IMAGE = /^image\//;
const TEXTUAL = /\.(txt|md|json|ya?ml|csv|log|ts|tsx|js|jsx|py|sh|css|html|xml|toml|ini|env)$/i;

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

export function FilePreview({ file, onClose }: { file: Attachment | null; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  const [shownPath, setShownPath] = useState<string | null>(null);

  const isImage = Boolean(file && IMAGE.test(file.mime ?? ""));
  const isText = Boolean(file && !isImage && TEXTUAL.test(file.name));
  const filePath = file?.path ?? null;

  if (filePath !== shownPath) {
    setShownPath(filePath);
    setText(null);
    setFailed(false);
    setLoading(Boolean(filePath && isText));
  }

  useEffect(() => {
    if (!filePath || !isText) return;
    let cancelled = false;
    api
      .get<{ text: string; truncated: boolean }>(`/file?path=${encodeURIComponent(filePath)}`)
      .then((result) => !cancelled && setText(result.text.slice(0, 20000)))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filePath, isText]);

  if (!file) return null;

  return (
    <Mask visible onMaskClick={onClose} className="preview-mask">
      <div className="preview" role="dialog" aria-label={file.name}>
        <header className="preview-bar">
          <span className="preview-name">{basename(file.name)}</span>
          <button className="preview-action" onClick={() => copy(file.path)}>
            Copy path
          </button>
          <button className="preview-close" onClick={onClose} aria-label="Close preview">
            ×
          </button>
        </header>

        <div className="preview-body">
          {isImage ? (
            <Thumb className="preview-image" path={file.path} alt={file.name} />
          ) : loading ? (
            <p className="preview-note">Loading…</p>
          ) : text !== null ? (
            <pre className="preview-text">{text}</pre>
          ) : (
            <div className="preview-note">
              <p>{failed ? "Could not read this file." : "No preview for this file type."}</p>
              <p className="preview-path">{file.path}</p>
            </div>
          )}
        </div>
      </div>
    </Mask>
  );
}
