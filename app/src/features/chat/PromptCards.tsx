import { useState } from "react";
import { Button, Input } from "antd-mobile";
import type { PendingPermission, PendingQuestion } from "../../api/types";
import { directionOf } from "../../lib/direction";

interface PermissionProps {
  pending: PendingPermission;
  onDecide: (decision: "allow" | "always" | "deny") => void;
}

export function PermissionCard({ pending, onDecide }: PermissionProps) {
  const [busy, setBusy] = useState(false);
  const input = pending.input as Record<string, unknown>;
  const preview = String(
    input.command ?? input.content ?? input.new_string ?? input.file_path ?? input.path ?? "",
  ).slice(0, 800);

  const decide = (decision: "allow" | "always" | "deny") => {
    setBusy(true);
    onDecide(decision);
  };

  return (
    <section className="prompt prompt-permission" role="alertdialog" aria-label="Permission needed">
      <p className="prompt-kicker">Permission needed</p>
      <div className="prompt-what">
        <span className="tool-name">{pending.displayName || pending.toolName}</span>
        <span className="tool-subject">{pending.description ?? ""}</span>
      </div>
      {pending.decisionReason ? <p className="prompt-note">{pending.decisionReason}</p> : null}
      {preview ? (
        <div className="code is-wrap">
          <div className="code-line code-ctx">{preview}</div>
        </div>
      ) : null}
      <div className="prompt-actions">
        <Button size="small" color="primary" disabled={busy} onClick={() => decide("allow")}>
          Allow
        </Button>
        {pending.canAlwaysAllow ? (
          <Button size="small" disabled={busy} onClick={() => decide("always")}>
            Always
          </Button>
        ) : null}
        <Button size="small" color="danger" fill="outline" disabled={busy} onClick={() => decide("deny")}>
          Deny
        </Button>
      </div>
    </section>
  );
}

interface QuestionProps {
  pending: PendingQuestion;
  onAnswer: (answers: { selected: string[]; other: string }[]) => void;
  onSkip: () => void;
}

export function QuestionCard({ pending, onAnswer, onSkip }: QuestionProps) {
  const [draft, setDraft] = useState(() =>
    pending.questions.map(() => ({ selected: [] as string[], other: "" })),
  );
  const [busy, setBusy] = useState(false);

  const toggle = (index: number, label: string, multi: boolean) => {
    setDraft((current) =>
      current.map((entry, position) => {
        if (position !== index) return entry;
        const has = entry.selected.includes(label);
        const selected = has
          ? entry.selected.filter((value) => value !== label)
          : multi
            ? [...entry.selected, label]
            : [label];
        return { ...entry, selected };
      }),
    );
  };

  const setOther = (index: number, value: string) => {
    setDraft((current) =>
      current.map((entry, position) => (position === index ? { ...entry, other: value } : entry)),
    );
  };

  const ready = draft.some((entry) => entry.selected.length > 0 || entry.other.trim().length > 0);

  return (
    <section className="prompt prompt-question" role="group" aria-label="Claude is asking">
      <p className="prompt-kicker">Claude is asking</p>

      {pending.questions.map((question, index) => (
        <div key={index} className="qblock">
          {question.header ? <p className="qheader">{question.header}</p> : null}
          <p className="qtitle" dir={directionOf(question.question)} style={{ unicodeBidi: "plaintext" }}>
            {question.question}
          </p>
          {question.multiSelect ? <p className="qhint">Pick one or more</p> : null}

          <div className="qoptions">
            {question.options.map((option) => {
              const on = draft[index]?.selected.includes(option.label);
              return (
                <button
                  key={option.label}
                  className={`qoption${on ? " is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => toggle(index, option.label, question.multiSelect)}
                >
                  <span className="qbox" aria-hidden="true" />
                  <span className="qtext">
                    <b dir={directionOf(option.label)}>{option.label}</b>
                    {option.description ? (
                      <em dir={directionOf(option.description)}>{option.description}</em>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <Input
            className="qother"
            placeholder="Something else…"
            value={draft[index]?.other ?? ""}
            onChange={(value) => setOther(index, value)}
          />
        </div>
      ))}

      <div className="prompt-actions">
        <Button
          size="small"
          color="primary"
          disabled={!ready || busy}
          onClick={() => {
            setBusy(true);
            onAnswer(draft);
          }}
        >
          Send answer
        </Button>
        <Button size="small" fill="outline" disabled={busy} onClick={onSkip}>
          Skip
        </Button>
      </div>
    </section>
  );
}
