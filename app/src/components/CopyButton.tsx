import { useEffect, useRef, useState } from "react";
import { copyText } from "../lib/clipboard";
import "./CopyButton.css";

type State = "idle" | "done" | "failed";

interface Props {
  text: string;
  label?: string;
  className?: string;
}

export function CopyButton({ text, label = "Copy", className }: Props) {
  const [state, setState] = useState<State>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const run = async () => {
    const ok = await copyText(text);
    setState(ok ? "done" : "failed");
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), 1600);
  };

  const title = state === "done" ? "Copied" : state === "failed" ? "Could not copy" : label;

  return (
    <button
      type="button"
      className={`copy${state === "done" ? " is-done" : ""}${state === "failed" ? " is-failed" : ""}${className ? ` ${className}` : ""}`}
      onClick={run}
      aria-label={title}
      title={title}
      disabled={!text}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        {state === "done" ? (
          <path d="M20 6 9 17l-5-5" />
        ) : state === "failed" ? (
          <>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </>
        ) : (
          <>
            <rect x="9" y="9" width="11" height="11" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </>
        )}
      </svg>
    </button>
  );
}
