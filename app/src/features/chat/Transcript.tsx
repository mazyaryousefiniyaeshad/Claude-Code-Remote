import { useState } from "react";
import type { Message, MessagePart } from "../../api/types";
import { RichText } from "../../lib/markdown";
import { directionOf } from "../../lib/direction";
import { ToolCard } from "./ToolCard";

function Thinking({ text, live }: { text: string; live: boolean }) {
  const [open, setOpen] = useState(live);
  return (
    <div className="think">
      <button className="think-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span className={`chev${open ? " is-open" : ""}`} aria-hidden="true" />
        Thinking
      </button>
      {open ? (
        <p className="think-body" dir={directionOf(text)} style={{ unicodeBidi: "plaintext" }}>
          {text}
        </p>
      ) : null}
    </div>
  );
}

export function Parts({ parts, live = false }: { parts: MessagePart[]; live?: boolean }) {
  return (
    <>
      {parts.map((part, index) => {
        if (part.kind === "text") return <div key={index} className="prose"><RichText text={part.text} /></div>;
        if (part.kind === "thinking") return <Thinking key={index} text={part.text} live={live} />;
        if (part.kind === "tool") return <ToolCard key={part.id ?? index} part={part} />;
        return (
          <div key={index} className="tool">
            <div className="tool-head">
              <span className="tool-name">Image</span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function mergeAssistant(messages: Message[]): Message[] {
  const out: Message[] = [];
  for (const message of messages) {
    const previous = out[out.length - 1];
    if (previous && previous.role === "assistant" && message.role === "assistant") {
      previous.parts = previous.parts.concat(message.parts);
    } else {
      out.push({ ...message, parts: [...message.parts] });
    }
  }
  return out;
}

export function Transcript({ messages }: { messages: Message[] }) {
  return (
    <>
      {mergeAssistant(messages).map((message, index) => (
        <article key={index} className={`turn turn-${message.role}`}>
          <p className="turn-who">{message.role === "user" ? "You" : "Claude"}</p>
          <div className="turn-body">
            <Parts parts={message.parts} />
          </div>
        </article>
      ))}
    </>
  );
}
