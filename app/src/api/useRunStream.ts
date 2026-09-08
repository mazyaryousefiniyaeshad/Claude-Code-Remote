import { useCallback, useEffect, useRef, useState } from "react";
import { streamUrl } from "./client";
import type { MessagePart, Pending, QueuedMessage, ToolResult } from "./types";

export interface LiveTool {
  id: string;
  name: string;
  input: Record<string, unknown>;
  result?: ToolResult;
}

export interface LiveState {
  text: string;
  thinking: string;
  tools: LiveTool[];
  error: string | null;
  pending: Pending[];
  queue: QueuedMessage[];
  lastEventAt: number;
}

const emptyLive = (pending: Pending[] = [], queue: QueuedMessage[] = []): LiveState => ({
  text: "",
  thinking: "",
  tools: [],
  error: null,
  pending,
  queue,
  lastEventAt: Date.now(),
});

export interface StreamHandlers {
  onSessionId?: (sessionId: string) => void;
  onTurn?: (parts: MessagePart[]) => void;
  onQueueStarted?: (prompt: string) => void;
}

function collect(state: LiveState): MessagePart[] {
  const parts: MessagePart[] = [];
  if (state.thinking) parts.push({ kind: "thinking", text: state.thinking });
  for (const tool of state.tools) {
    parts.push({ kind: "tool", id: tool.id, name: tool.name, input: tool.input, result: tool.result });
  }
  if (state.text) parts.push({ kind: "text", text: state.text });
  if (state.error) parts.push({ kind: "text", text: `Error: ${state.error}` });
  return parts;
}

export function useRunStream(handlers: StreamHandlers = {}) {
  const [runId, setRunId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [live, setLive] = useState<LiveState | null>(null);

  const sourceRef = useRef<EventSource | null>(null);
  const consumedRef = useRef(0);
  const liveRef = useRef<LiveState | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const detach = useCallback(() => {
    sourceRef.current?.close();
    sourceRef.current = null;
    consumedRef.current = 0;
    liveRef.current = null;
    setLive(null);
    setRunId(null);
    setStartedAt(0);
  }, []);

  const commit = useCallback((next: LiveState) => {
    liveRef.current = next;
    setLive(next);
  }, []);

  const connect = useCallback(
    (id: string, from: number) => {
      const source = new EventSource(streamUrl(id, from));
      sourceRef.current = source;

      source.onmessage = (event) => {
        consumedRef.current += 1;
        const current = liveRef.current;
        if (!current) return;

        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }

        const sessionId = payload.session_id;
        if (typeof sessionId === "string") handlersRef.current.onSessionId?.(sessionId);

        const next: LiveState = { ...current, lastEventAt: Date.now() };

        switch (payload.type) {
          case "stream_event": {
            const inner = payload.event as
              | { type?: string; delta?: { type?: string; text?: string; thinking?: string } }
              | undefined;
            if (inner?.type === "content_block_delta") {
              if (inner.delta?.type === "text_delta") next.text += inner.delta.text ?? "";
              if (inner.delta?.type === "thinking_delta") next.thinking += inner.delta.thinking ?? "";
            }
            break;
          }
          case "assistant": {
            const content = (payload.message as { content?: unknown[] } | undefined)?.content ?? [];
            const tools = [...next.tools];
            for (const block of content as Record<string, unknown>[]) {
              if (block.type !== "tool_use") continue;
              const id = String(block.id);
              if (tools.some((tool) => tool.id === id)) continue;
              tools.push({
                id,
                name: String(block.name),
                input: (block.input ?? {}) as Record<string, unknown>,
              });
            }
            next.tools = tools;
            break;
          }
          case "user": {
            const content = (payload.message as { content?: unknown[] } | undefined)?.content ?? [];
            const tools = next.tools.map((tool) => ({ ...tool }));
            for (const block of content as Record<string, unknown>[]) {
              if (block.type !== "tool_result") continue;
              const target = tools.find((tool) => tool.id === block.tool_use_id);
              if (!target) continue;
              const raw = block.content;
              target.result = {
                isError: Boolean(block.is_error),
                text:
                  typeof raw === "string"
                    ? raw
                    : Array.isArray(raw)
                      ? raw.map((part) => (part as { text?: string }).text ?? "").join("\n")
                      : "",
              };
            }
            next.tools = tools;
            break;
          }
          case "question_request":
          case "permission_request": {
            const item = payload as unknown as Pending;
            if (!next.pending.some((entry) => entry.id === item.id)) {
              next.pending = [...next.pending, item];
              navigator.vibrate?.([60, 40, 60]);
            }
            break;
          }
          case "permission_resolved": {
            next.pending = next.pending.filter((entry) => entry.id !== payload.id);
            break;
          }
          case "runner_error": {
            next.error = String(payload.message ?? "Run failed");
            break;
          }
          case "result": {
            if (payload.is_error) next.error = String(payload.result ?? "Run failed");
            break;
          }
          case "queued": {
            const item = { id: String(payload.id), prompt: String(payload.prompt ?? "") };
            if (!next.queue.some((entry) => entry.id === item.id)) next.queue = [...next.queue, item];
            break;
          }
          case "unqueued": {
            next.queue = next.queue.filter((entry) => entry.id !== payload.id);
            break;
          }
          case "queue_started": {
            next.queue = next.queue.filter((entry) => entry.id !== payload.id);
            handlersRef.current.onQueueStarted?.(String(payload.prompt ?? ""));
            break;
          }
          case "turn_done": {
            const parts = collect(next);
            if (parts.length) handlersRef.current.onTurn?.(parts);
            next.text = "";
            next.thinking = "";
            next.tools = [];
            next.error = null;
            break;
          }
          case "runner_done": {
            source.close();
            sourceRef.current = null;
            const parts = collect(next);
            liveRef.current = null;
            setLive(null);
            setRunId(null);
            setStartedAt(0);
            if (parts.length) handlersRef.current.onTurn?.(parts);
            return;
          }
          default:
            break;
        }

        commit(next);
      };

      source.onerror = () => {
        source.close();
        if (sourceRef.current !== source) return;
        sourceRef.current = null;
        window.setTimeout(() => {
          if (liveRef.current) connect(id, consumedRef.current);
        }, 1500);
      };
    },
    [commit],
  );

  const attach = useCallback(
    (id: string, started: number, pending: Pending[] = [], queue: QueuedMessage[] = []) => {
      sourceRef.current?.close();
      consumedRef.current = 0;
      const initial = emptyLive(pending, queue);
      liveRef.current = initial;
      setLive(initial);
      setRunId(id);
      setStartedAt(started || Date.now());
      connect(id, 0);
    },
    [connect],
  );

  const resolvePending = useCallback((id: string) => {
    const current = liveRef.current;
    if (!current) return;
    commit({ ...current, pending: current.pending.filter((entry) => entry.id !== id) });
  }, [commit]);

  useEffect(() => () => sourceRef.current?.close(), []);

  const dropQueued = useCallback((id: string) => {
    const current = liveRef.current;
    if (!current) return;
    commit({ ...current, queue: current.queue.filter((entry) => entry.id !== id) });
  }, [commit]);

  return { runId, startedAt, live, attach, detach, resolvePending, dropQueued };
}
