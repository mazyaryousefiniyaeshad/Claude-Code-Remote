import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from "react";
import type { Attachment } from "../../api/types";
import { api } from "../../api/client";
import { Thumb } from "../../components/Thumb";
import { enterSends } from "../../lib/storage";
import { FilePreview } from "./FilePreview";

interface ComposerProps {
  running: boolean;
  onSend: (prompt: string, attachments: Attachment[]) => void;
  onStop: () => void;
  chips?: React.ReactNode;
  queue?: React.ReactNode;
}

export function Composer({ running, onSend, chips, queue }: ComposerProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const composing = useRef(false);
  const [sendOnEnter] = useState(() => enterSends());

  const grow = () => {
    const node = areaRef.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${Math.min(node.scrollHeight, window.innerHeight * 0.35)}px`;
  };

  const submit = () => {
    const text = value.trim();
    if (!text && attachments.length === 0) return;
    onSend(text, attachments);
    setValue("");
    setAttachments([]);
    requestAnimationFrame(grow);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || composing.current) return;
    if (event.shiftKey || event.altKey) return;
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      submit();
      return;
    }
    if (!sendOnEnter) return;
    event.preventDefault();
    submit();
  };

  const filesFrom = (data: DataTransfer | null) => {
    if (!data) return [];
    const out: File[] = [];
    if (data.files?.length) out.push(...Array.from(data.files));
    else {
      for (const item of Array.from(data.items ?? [])) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (file) out.push(file);
      }
    }
    return out;
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = filesFrom(event.clipboardData);
    if (!files.length) return;
    event.preventDefault();
    upload(files);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const files = filesFrom(event.dataTransfer);
    if (files.length) upload(files);
  };

  const upload = async (files: FileList | File[] | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const result = await api.upload(files);
      setAttachments((current) => [...current, ...result.files]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div
      className={`composer${dragging ? " is-dragging" : ""}`}
      onDragOver={(event) => {
        if (!event.dataTransfer?.types?.includes("Files")) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {queue}
      {chips ? <div className="composer-chips">{chips}</div> : null}

      {uploading ? <p className="upload-note">Uploading…</p> : null}

      {attachments.length > 0 ? (
        <div className="attachments">
          {attachments.map((file, index) => (
            <span key={file.path} className="attachment">
              <button
                className="attachment-open"
                onClick={() => setPreview(file)}
                aria-label={`Preview ${file.name}`}
              >
                {file.mime?.startsWith("image/") ? (
                  <Thumb className="attachment-thumb" path={file.path} />
                ) : (
                  <span className="attachment-icon" aria-hidden="true" />
                )}
                <span className="attachment-name">{file.name}</span>
              </button>
              <button
                className="attachment-remove"
                aria-label={`Remove ${file.name}`}
                onClick={() => setAttachments((current) => current.filter((_, i) => i !== index))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <div className="composer-row">
        <button
          className="icon-btn"
          aria-label="Attach file"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21.4 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.33 3.33 0 0 1 4.71 4.71l-9.2 9.19a1.67 1.67 0 0 1-2.36-2.36l8.49-8.48" />
          </svg>
        </button>

        <textarea
          ref={areaRef}
          className="composer-input"
          rows={1}
          value={value}
          placeholder={running ? "Queue a message…" : "Message Claude…"}
          aria-label="Message"
          enterKeyHint={sendOnEnter ? "send" : "enter"}
          onChange={(event) => {
            setValue(event.target.value);
            grow();
          }}
          onCompositionStart={() => (composing.current = true)}
          onCompositionEnd={() => (composing.current = false)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
        />

        <button
          className={`send-btn${running ? " is-queue" : ""}`}
          aria-label={running ? "Add to queue" : "Send"}
          disabled={!value.trim() && attachments.length === 0}
          onClick={submit}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      <input ref={fileRef} type="file" multiple hidden onChange={(event) => upload(event.target.files)} />
      <FilePreview file={preview} onClose={() => setPreview(null)} />
    </div>
  );
}
