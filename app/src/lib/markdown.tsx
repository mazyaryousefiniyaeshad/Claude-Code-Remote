import type { ReactNode } from "react";
import { directionOf } from "./direction";

type Segment = { kind: "code"; text: string } | { kind: "line"; text: string };

function segment(source: string): Segment[] {
  const out: Segment[] = [];
  const fence = /```(?:\w*)\n([\s\S]*?)```/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fence.exec(source)) !== null) {
    const before = source.slice(cursor, match.index);
    for (const line of before.split("\n")) out.push({ kind: "line", text: line });
    out.push({ kind: "code", text: match[1].replace(/\n$/, "") });
    cursor = match.index + match[0].length;
  }
  for (const line of source.slice(cursor).split("\n")) out.push({ kind: "line", text: line });
  return out;
}

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    if (token.startsWith("`")) {
      nodes.push(
        <code key={`${keyPrefix}-c${index}`} dir="ltr">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      nodes.push(<b key={`${keyPrefix}-b${index}`}>{token.slice(2, -2)}</b>);
    }
    cursor = match.index + token.length;
    index += 1;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

export function RichText({ text }: { text: string }) {
  const segments = segment(text);

  return (
    <>
      {segments.map((item, index) => {
        if (item.kind === "code") {
          return (
            <pre key={index} className="code-block" dir="ltr">
              <code>{item.text}</code>
            </pre>
          );
        }
        const raw = item.text;
        if (!raw.trim()) return <div key={index} className="line-gap" />;

        const heading = raw.match(/^#{1,4}\s+(.*)$/);
        const body = heading ? heading[1] : raw;
        const naked = body.replace(/`[^`\n]*`/g, " ");

        return (
          <div
            key={index}
            className={heading ? "line line-heading" : "line"}
            dir={directionOf(naked)}
            style={{ unicodeBidi: "plaintext" }}
          >
            {inline(body, String(index))}
          </div>
        );
      })}
    </>
  );
}
