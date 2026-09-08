import { useState } from "react";
import type { MessagePart } from "../../api/types";
import { lineDiff, type DiffRow } from "../../lib/diff";
import { basename } from "../../lib/format";

type ToolPart = Extract<MessagePart, { kind: "tool" }>;

interface Shape {
  subject: string;
  added?: number;
  removed?: number;
  rows: DiffRow[];
  wrap: boolean;
  output?: string;
}

function describe(part: ToolPart): Shape {
  const input = part.input as Record<string, never>;
  const text = (value: unknown) => String(value ?? "");

  switch (part.name) {
    case "Edit":
    case "MultiEdit": {
      const edits = (input.edits as { old_string: string; new_string: string }[] | undefined) ?? [
        { old_string: text(input.old_string), new_string: text(input.new_string) },
      ];
      let added = 0;
      let removed = 0;
      let rows: DiffRow[] = [];
      for (const edit of edits) {
        const result = lineDiff(edit.old_string, edit.new_string);
        added += result.added;
        removed += result.removed;
        rows = rows.concat(result.rows);
      }
      return { subject: basename(text(input.file_path)), added, removed, rows, wrap: false };
    }
    case "Write": {
      const lines = text(input.content).split("\n");
      return {
        subject: basename(text(input.file_path)),
        added: lines.length,
        rows: lines.map((line) => ({ kind: "add" as const, text: line })),
        wrap: false,
      };
    }
    case "Bash":
    case "BashOutput":
      return {
        subject: text(input.description) || text(input.command).slice(0, 60),
        rows: [{ kind: "ctx", text: text(input.command) }],
        wrap: true,
        output: part.result?.text?.slice(0, 2000),
      };
    case "Read":
      return { subject: basename(text(input.file_path) || text(input.path)), rows: [], wrap: false };
    case "Grep":
    case "Glob":
      return {
        subject: [text(input.pattern), input.path ? basename(text(input.path)) : ""]
          .filter(Boolean)
          .join("  "),
        rows: [],
        wrap: false,
      };
    case "Task":
    case "Agent":
      return {
        subject: text(input.description) || text(input.subagent_type),
        rows: input.prompt ? [{ kind: "ctx", text: text(input.prompt).slice(0, 900) }] : [],
        wrap: true,
      };
    case "TodoWrite": {
      const todos = (input.todos as { content: string; status: string }[] | undefined) ?? [];
      const done = todos.filter((todo) => todo.status === "completed").length;
      return {
        subject: `${done}/${todos.length} done`,
        rows: todos.map((todo) => ({
          kind: todo.status === "completed" ? ("add" as const) : ("ctx" as const),
          text: `${todo.status === "completed" ? "[x]" : todo.status === "in_progress" ? "[>]" : "[ ]"} ${todo.content}`,
        })),
        wrap: true,
      };
    }
    default: {
      const json = JSON.stringify(input, null, 1);
      return {
        subject: text(input.file_path || input.path || input.url || input.command).slice(0, 70),
        rows: json && json.length > 2 ? [{ kind: "ctx", text: json.slice(0, 1200) }] : [],
        wrap: true,
      };
    }
  }
}

export function ToolCard({ part }: { part: ToolPart }) {
  const [open, setOpen] = useState(false);
  const shape = describe(part);
  const expandable = shape.rows.length > 0 || Boolean(shape.output);
  const state = part.result ? (part.result.isError ? "failed" : "done") : "working";

  return (
    <div className="tool">
      <button
        className="tool-head"
        onClick={() => expandable && setOpen((value) => !value)}
        disabled={!expandable}
        aria-expanded={expandable ? open : undefined}
      >
        <span className="tool-name">{part.name}</span>
        <span className="tool-subject">{shape.subject}</span>
        {shape.added ? <span className="count count-add num">+{shape.added}</span> : null}
        {shape.removed ? <span className="count count-del num">−{shape.removed}</span> : null}
        <span className={`tool-state tool-state-${state}`} aria-hidden="true" />
        {expandable ? <span className={`chev${open ? " is-open" : ""}`} aria-hidden="true" /> : null}
      </button>

      {open ? (
        <div className="tool-body">
          {shape.rows.length ? (
            <div className={`code${shape.wrap ? " is-wrap" : ""}`}>
              {shape.rows.slice(0, 60).map((row, index) => (
                <div key={index} className={`code-line code-${row.kind}`}>
                  {row.kind === "add" ? "+" : row.kind === "del" ? "−" : " "} {row.text}
                </div>
              ))}
              {shape.rows.length > 60 ? (
                <div className="code-line code-ctx">  … {shape.rows.length - 60} more lines</div>
              ) : null}
            </div>
          ) : null}
          {shape.output ? <div className="tool-output">{shape.output}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
