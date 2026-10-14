import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import readline from "node:readline";

export const PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

export function encodeCwd(cwd) {
  return cwd.replace(/[/.\s_]/g, "-");
}

const NOISE_TAGS = ["system-reminder", "local-command-caveat", "command-name", "command-message", "command-args", "local-command-stdout", "ide_selection"];

function stripReminders(text) {
  let out = text;
  for (const tag of NOISE_TAGS) {
    out = out.replace(new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "g"), "");
    out = out.replace(new RegExp(`<${tag}\\s*\\/>`, "g"), "");
  }
  return out.trim();
}

function resultText(content) {
  if (typeof content === "string") return content.slice(0, 4000);
  if (!Array.isArray(content)) return "";
  return content
    .map((b) => (b.type === "text" ? b.text : b.type === "image" ? "[image]" : ""))
    .join("\n")
    .slice(0, 4000);
}

function blocksToParts(content) {
  if (typeof content === "string") {
    const t = stripReminders(content);
    return t ? [{ kind: "text", text: t }] : [];
  }
  if (!Array.isArray(content)) return [];
  const parts = [];
  for (const b of content) {
    if (b.type === "text") {
      const t = stripReminders(b.text || "");
      if (t) parts.push({ kind: "text", text: t });
    } else if (b.type === "thinking") {
      if (b.thinking) parts.push({ kind: "thinking", text: b.thinking });
    } else if (b.type === "tool_use") {
      parts.push({ kind: "tool", name: b.name, input: b.input, id: b.id });
    } else if (b.type === "tool_result") {
      parts.push({ kind: "tool_result", id: b.tool_use_id, isError: !!b.is_error, text: resultText(b.content) });
    } else if (b.type === "image") {
      parts.push({ kind: "image" });
    }
  }
  return parts;
}

async function readJsonl(file, onLine) {
  const stream = fs.createReadStream(file, { encoding: "utf8" });
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  try {
    for await (const line of rl) {
      if (!line.trim()) continue;
      let obj;
      try { obj = JSON.parse(line); } catch { continue; }
      if (onLine(obj) === false) break;
    }
  } finally {
    rl.close();
    stream.destroy();
  }
}

const metaCache = new Map();

async function sessionMeta(file) {
  const id = path.basename(file, ".jsonl");
  const stat = await fsp.stat(file);
  const key = `${file}:${stat.mtimeMs}:${stat.size}`;
  const hit = metaCache.get(key);
  if (hit) return hit;
  let cwd = null, title = null, firstPrompt = null, name = null;
  let userCount = 0, assistantCount = 0;

  await readJsonl(file, (o) => {
    if (o.cwd && !cwd) cwd = o.cwd;
    if (o.type === "ai-title" && o.aiTitle) title = o.aiTitle;
    if (o.type === "session-name" && o.name) name = o.name;
    if (o.type === "user" && !o.isSidechain) {
      userCount++;
      if (!firstPrompt) {
        const parts = blocksToParts(o.message?.content);
        const t = parts.find((p) => p.kind === "text");
        if (t) firstPrompt = t.text.slice(0, 200);
      }
    }
    if (o.type === "assistant" && !o.isSidechain) assistantCount++;
  });

  const meta = {
    id,
    cwd,
    title: name || title || firstPrompt || "Untitled",
    firstPrompt,
    mtime: stat.mtimeMs,
    size: stat.size,
    userCount,
    assistantCount,
    empty: userCount === 0,
  };

  if (metaCache.size > 400) {
    for (const k of [...metaCache.keys()].slice(0, 200)) metaCache.delete(k);
  }
  metaCache.set(key, meta);
  return meta;
}

export async function listWorkspaces() {
  let dirs = [];
  try { dirs = await fsp.readdir(PROJECTS_DIR, { withFileTypes: true }); } catch { return []; }

  const out = [];
  for (const d of dirs) {
    if (!d.isDirectory()) continue;
    const dir = path.join(PROJECTS_DIR, d.name);
    let files;
    try { files = (await fsp.readdir(dir)).filter((f) => f.endsWith(".jsonl")); } catch { continue; }
    if (!files.length) continue;

    let newest = 0, cwd = null;
    for (const f of files) {
      const st = await fsp.stat(path.join(dir, f)).catch(() => null);
      if (st && st.mtimeMs > newest) newest = st.mtimeMs;
    }
    for (const f of files) {
      let found = null;
      await readJsonl(path.join(dir, f), (o) => { if (o.cwd) { found = o.cwd; return false; } });
      if (found) { cwd = found; break; }
    }
    if (!cwd) continue;
    let exists = true;
    try { await fsp.access(cwd); } catch { exists = false; }
    out.push({ slug: d.name, cwd, name: path.basename(cwd), sessionCount: files.length, mtime: newest, exists });
  }
  out.sort((a, b) => b.mtime - a.mtime);
  return out;
}

export async function listSessions(cwd) {
  const dir = path.join(PROJECTS_DIR, encodeCwd(cwd));
  let files;
  try { files = (await fsp.readdir(dir)).filter((f) => f.endsWith(".jsonl")); } catch { return []; }
  const metas = await Promise.all(files.map((f) => sessionMeta(path.join(dir, f)).catch(() => null)));
  return metas.filter((m) => m && !m.empty).sort((a, b) => b.mtime - a.mtime);
}

export async function readHistory(cwd, sessionId, { limit = 0, before = 0 } = {}) {
  const file = path.join(PROJECTS_DIR, encodeCwd(cwd), `${sessionId}.jsonl`);
  if (!/^[\w-]+$/.test(sessionId) || !fs.existsSync(file)) throw new Error("Session not found");
  const messages = [];
  const results = new Map();

  await readJsonl(file, (o) => {
    if (o.isSidechain) return;
    if (o.type !== "user" && o.type !== "assistant") return;
    const parts = blocksToParts(o.message?.content);
    if (!parts.length) return;

    const visible = [];
    for (const p of parts) {
      if (p.kind === "tool_result") results.set(p.id, { isError: p.isError, text: p.text });
      else visible.push(p);
    }
    if (!visible.length) return;
    messages.push({ role: o.type, parts: visible, timestamp: o.timestamp, uuid: o.uuid });
  });

  const total = messages.length;
  let slice = messages;
  let offset = 0;

  if (limit > 0) {
    const end = before > 0 ? Math.min(before, total) : total;
    offset = Math.max(0, end - limit);
    slice = messages.slice(offset, end);
  }

  for (const m of slice) {
    for (const p of m.parts) {
      if (p.kind === "tool" && results.has(p.id)) p.result = results.get(p.id);
    }
  }
  return { messages: slice, total, offset, hasMore: offset > 0 };
}
