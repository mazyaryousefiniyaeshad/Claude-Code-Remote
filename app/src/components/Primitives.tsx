import type { ReactNode } from "react";
import { directionOf } from "../lib/direction";
import "./Primitives.css";

export type Tone = "idle" | "working" | "waiting" | "done" | "failed";

export function StatusDot({ tone }: { tone: Tone }) {
  return <span className={`dot dot-${tone}`} aria-hidden="true" />;
}

export function Tag({ tone, children }: { tone: Tone; children: ReactNode }) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function Bidi({
  as = "div",
  text,
  className,
}: {
  as?: "div" | "p" | "span";
  text: string;
  className?: string;
}) {
  const Component = as;
  return (
    <Component className={className} dir={directionOf(text)} style={{ unicodeBidi: "plaintext" }}>
      {text}
    </Component>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {hint ? <p className="empty-hint">{hint}</p> : null}
    </div>
  );
}

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="empty" role="status">
      <span className="pulse" aria-hidden="true" />
      <p className="empty-hint">{label}</p>
    </div>
  );
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <div className="error-note" role="alert">
      {message}
    </div>
  );
}

export function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2 className="section-label">{label}</h2>
      {children}
    </section>
  );
}
