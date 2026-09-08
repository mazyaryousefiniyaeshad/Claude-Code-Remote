export type DiffKind = "add" | "del" | "ctx";

export interface DiffRow {
  kind: DiffKind;
  text: string;
}

export interface DiffResult {
  rows: DiffRow[];
  added: number;
  removed: number;
}

export function lineDiff(before: unknown, after: unknown): DiffResult {
  const left = String(before ?? "").split("\n");
  const right = String(after ?? "").split("\n");

  let head = 0;
  while (head < left.length && head < right.length && left[head] === right[head]) head += 1;

  let tail = 0;
  while (
    tail < left.length - head &&
    tail < right.length - head &&
    left[left.length - 1 - tail] === right[right.length - 1 - tail]
  ) {
    tail += 1;
  }

  const removed = left.slice(head, left.length - tail);
  const added = right.slice(head, right.length - tail);

  const rows: DiffRow[] = [];
  if (head > 0) rows.push({ kind: "ctx", text: left[head - 1] });
  for (const text of removed) rows.push({ kind: "del", text });
  for (const text of added) rows.push({ kind: "add", text });

  return { rows, added: added.length, removed: removed.length };
}
