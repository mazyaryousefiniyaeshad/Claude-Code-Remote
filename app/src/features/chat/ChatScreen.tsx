import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Screen } from "../../components/Screen";
import { Empty, Loading, ErrorNote } from "../../components/Primitives";
import { Transcript, Parts } from "./Transcript";
import { Composer } from "./Composer";
import { QueueStrip } from "./QueueStrip";
import { PermissionCard, QuestionCard } from "./PromptCards";
import { RunStatusBar } from "./RunStatusBar";
import { useRunStream } from "../../api/useRunStream";
import {
  HISTORY_PAGE,
  answerPermission,
  answerQuestion,
  enqueueMessage,
  fetchHistory,
  skipQuestion,
  startRun,
  stopRun,
  useRuns,
} from "../../api/hooks";
import type { Attachment, Message, MessagePart } from "../../api/types";
import { readRunOptions, writeActiveRun } from "../../lib/storage";
import { RunChips } from "./RunChips";
import { SkillPicker } from "./SkillPicker";
import { basename } from "../../lib/format";
import "./chat.css";

function trimInFlight(messages: Message[]): Message[] {
  let end = messages.length;
  while (end > 0 && messages[end - 1].role === "assistant") end -= 1;
  return end === messages.length ? messages : messages.slice(0, end);
}

export function ChatScreen() {
  const [params, setParams] = useSearchParams();
  const cwd = params.get("cwd") ?? "";
  const sessionParam = params.get("session") || null;
  const runParam = params.get("run") || null;

  const [sessionId, setSessionId] = useState(sessionParam);
  const [messages, setMessages] = useState<Message[]>([]);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState(() => readRunOptions());
  const [skills, setSkills] = useState<string[]>([]);

  const bodyRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef(true);
  const ownRunRef = useRef(false);
  const attachedRef = useRef<Set<string>>(new Set());
  const cwdRef = useRef(cwd);
  cwdRef.current = cwd;
  const setParamsRef = useRef(setParams);
  setParamsRef.current = setParams;
  const runs = useRuns(0);

  const stream = useRunStream({
    onSessionId: (id) => {
      setSessionId((current) => {
        if (current === id) return current;
        setParamsRef.current({ cwd: cwdRef.current, session: id }, { replace: true });
        return id;
      });
    },
    onTurn: (parts: MessagePart[]) => {
      if (parts.length) setMessages((current) => [...current, { role: "assistant", parts }]);
    },
    onQueueStarted: (prompt: string) => {
      setMessages((current) => [...current, { role: "user", parts: [{ kind: "text", text: prompt }] }]);
    },
  });

  useEffect(() => {
    let cancelled = false;
    if (!sessionParam) {
      setMessages([]);
      setOffset(0);
      setTotal(0);
      return;
    }
    setLoading(true);
    setError(null);
    fetchHistory(cwd, sessionParam)
      .then((history) => {
        if (cancelled) return;
        setMessages(history.messages);
        setOffset(history.offset);
        setTotal(history.total);
      })
      .catch((cause: Error) => !cancelled && setError(cause.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [cwd, sessionParam]);

  const attach = stream.attach;
  const activeRunId = stream.runId;

  useEffect(() => {
    if (activeRunId) return;
    const live = (runs.data ?? []).find((run) =>
      run.status === "running" && (runParam ? run.runId === runParam : run.sessionId === sessionId),
    );
    if (!live || attachedRef.current.has(live.runId)) return;
    attachedRef.current.add(live.runId);
    setMessages((current) => trimInFlight(current));
    attach(live.runId, live.startedAt, live.pending, live.queued);
  }, [runs.data, runParam, sessionId, activeRunId, attach]);

  useEffect(() => {
    const node = bodyRef.current;
    if (!node || !stickyRef.current) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, stream.live?.text, stream.live?.thinking, stream.live?.tools.length]);

  const onScroll = useCallback(() => {
    const node = bodyRef.current;
    if (!node) return;
    stickyRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 140;
  }, []);

  const loadEarlier = async () => {
    if (loadingMore || offset <= 0 || !sessionId) return;
    setLoadingMore(true);
    try {
      const history = await fetchHistory(cwd, sessionId, offset);
      setMessages((current) => [...history.messages, ...current]);
      setOffset(history.offset);
      setTotal(history.total);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const send = async (prompt: string, attachments: Attachment[]) => {
    stickyRef.current = true;

    let body = prompt;
    if (attachments.length) {
      const list = attachments.map((file) => `- ${file.path}`).join("\n");
      body = `${prompt}\n\nAttached files (absolute paths on this machine):\n${list}`.trim();
    }
    if (skills.length) {
      body = `${skills.map((id) => `/${id}`).join("\n")}\n\n${body}`.trim();
    }

    if (stream.runId) {
      try {
        await enqueueMessage(stream.runId, body);
      } catch (cause) {
        setError((cause as Error).message);
      }
      return;
    }

    const parts: MessagePart[] = [];
    if (prompt) parts.push({ kind: "text", text: prompt });
    for (const file of attachments) {
      parts.push({ kind: "tool", name: "Attachment", input: { file_path: file.path } });
    }
    setMessages((current) => [...current, { role: "user", parts }]);

    try {
      const started = await startRun({ cwd, sessionId, prompt: body, options });
      if (started.sessionId && started.sessionId !== sessionId) setSessionId(started.sessionId);
      writeActiveRun({ runId: started.runId, sessionId: started.sessionId, cwd });
      ownRunRef.current = true;
      attachedRef.current.add(started.runId);
      stream.attach(started.runId, Date.now());
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const halt = async () => {
    if (!stream.runId) return;
    await stopRun(stream.runId).catch(() => undefined);
  };

  const live = stream.live;
  const liveParts: MessagePart[] = [];
  if (live?.thinking) liveParts.push({ kind: "thinking", text: live.thinking });
  for (const tool of live?.tools ?? []) {
    liveParts.push({ kind: "tool", id: tool.id, name: tool.name, input: tool.input, result: tool.result });
  }
  if (live?.text) liveParts.push({ kind: "text", text: live.text });

  const waiting = (live?.pending.length ?? 0) > 0;

  return (
    <Screen
      title={sessionId ? "Session" : "New session"}
      subtitle={cwd}
      back="/"
      bodyRef={bodyRef}
      onBodyScroll={onScroll}
      bodyClassName="chat-body"
      footer={
        <>
          {stream.runId ? (
            <RunStatusBar
              startedAt={stream.startedAt}
              lastEventAt={live?.lastEventAt ?? 0}
              waiting={waiting}
              onStop={halt}
            />
          ) : null}
          <Composer
            running={Boolean(stream.runId)}
            onSend={send}
            onStop={halt}
            queue={
              stream.runId ? (
                <QueueStrip
                  runId={stream.runId}
                  items={live?.queue ?? []}
                  onDrop={stream.dropQueued}
                />
              ) : null
            }
            chips={
              <>
                <SkillPicker cwd={cwd} selected={skills} onChange={setSkills} />
                <RunChips
                  model={options.model}
                  mode={options.permissionMode}
                  effort={options.effort}
                  onChange={(next) =>
                    setOptions((current) => ({
                      ...current,
                      model: next.model,
                      permissionMode: next.mode,
                      effort: next.effort,
                    }))
                  }
                />
              </>
            }
          />
        </>
      }
    >
      <>
        {offset > 0 ? (
          <button className="load-earlier" disabled={loadingMore} onClick={loadEarlier}>
            {loadingMore ? "Loading…" : `Load earlier (${offset} of ${total})`}
          </button>
        ) : null}

        {loading ? <Loading /> : null}
        {error ? <ErrorNote message={error} /> : null}
        {!loading && messages.length === 0 && !live ? (
          <Empty title="Nothing here yet" hint="Send the first message to start this session." />
        ) : null}

        <Transcript messages={messages} />

        {live && liveParts.length > 0 ? (
          <article className="turn turn-assistant is-live">
            <p className="turn-who">Claude</p>
            <div className="turn-body">
              <Parts parts={liveParts} live />
              {live.error ? <ErrorNote message={live.error} /> : null}
            </div>
          </article>
        ) : null}

        {live?.pending.map((pending) =>
          pending.kind === "question" ? (
            <QuestionCard
              key={pending.id}
              pending={pending}
              onAnswer={async (answers) => {
                if (!stream.runId) return;
                await answerQuestion(stream.runId, pending.id, answers).catch(() => undefined);
                stream.resolvePending(pending.id);
              }}
              onSkip={async () => {
                if (!stream.runId) return;
                await skipQuestion(stream.runId, pending.id).catch(() => undefined);
                stream.resolvePending(pending.id);
              }}
            />
          ) : (
            <PermissionCard
              key={pending.id}
              pending={pending}
              onDecide={async (decision) => {
                if (!stream.runId) return;
                await answerPermission(stream.runId, pending.id, decision).catch(() => undefined);
                stream.resolvePending(pending.id);
              }}
            />
          ),
        )}

        <div className="chat-tail" />
      </>
    </Screen>
  );
}

export const chatTitleFor = (cwd: string) => basename(cwd);
export const HISTORY_SIZE = HISTORY_PAGE;
