import express from "express";
import busboy from "busboy";
import compression from "compression";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { listWorkspaces, listSessions, readHistory, encodeCwd } from "./lib/sessions.js";
import {
  startRun,
  getRun,
  listRuns,
  stopRun,
  subscribe,
  answerPermission,
  answerQuestion,
  enqueueMessage,
  dequeueMessage,
} from "./lib/claude.js";
import { listDir, readFileText, listPorts, safePath } from "./lib/files.js";
import { listFavorites, setFavorite, favoriteIds, pruneFavorites } from "./lib/favorites.js";
import { listSkills } from "./lib/skills.js";
import { getUsage } from "./lib/usage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 61777);
const HOST = process.env.HOST || "0.0.0.0";
const UPLOAD_ROOT = path.join(os.homedir(), ".claude-remote", "uploads");
const RUN_TIMEOUT_MS = Number(process.env.RUN_TIMEOUT_MS || 0);
const TOKEN_FILE = path.join(os.homedir(), ".claude-remote", "token");

await fsp.mkdir(UPLOAD_ROOT, { recursive: true });

async function loadToken() {
  if (process.env.CLAUDE_REMOTE_TOKEN) return process.env.CLAUDE_REMOTE_TOKEN;
  try {
    const t = (await fsp.readFile(TOKEN_FILE, "utf8")).trim();
    if (t) return t;
  } catch {}
  const t = crypto.randomBytes(18).toString("base64url");
  await fsp.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await fsp.writeFile(TOKEN_FILE, t + "\n", { mode: 0o600 });
  return t;
}
const TOKEN = await loadToken();

const app = express();
app.disable("x-powered-by");
app.use(compression({
  filter: (req, res) => (res.getHeader("Content-Type") || "").toString().includes("text/event-stream")
    ? false
    : compression.filter(req, res),
}));
app.use(express.json({ limit: "4mb" }));

function tokenOf(req) {
  const h = req.get("authorization");
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return req.query.token || req.get("x-auth-token") || null;
}

app.use("/api", (req, res, next) => {
  const origin = req.get("origin");
  if (origin) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/api", (req, res, next) => {
  const t = tokenOf(req);
  if (t && t.length === TOKEN.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(TOKEN))) return next();
  res.status(401).json({ error: "توکن نامعتبر" });
});

const ok = (res, data) => res.json(data);
const fail = (res, err, code = 400) => res.status(code).json({ error: err?.message || String(err) });

app.get("/api/health", (_req, res) => ok(res, { ok: true, port: PORT, host: os.hostname(), now: Date.now() }));

app.get("/api/workspaces", async (_req, res) => {
  try { ok(res, { workspaces: await listWorkspaces() }); } catch (e) { fail(res, e); }
});

app.get("/api/sessions", async (req, res) => {
  try {
    const cwd = safePath(String(req.query.cwd || ""));
    const [sessions, favs] = await Promise.all([listSessions(cwd), favoriteIds()]);
    const set = new Set(favs);
    ok(res, { cwd, sessions: sessions.map((x) => ({ ...x, starred: set.has(x.id) })) });
  } catch (e) { fail(res, e); }
});

app.get("/api/history", async (req, res) => {
  try {
    const cwd = safePath(String(req.query.cwd || ""));
    const limit = Math.min(Number(req.query.limit) || 0, 500);
    const before = Number(req.query.before) || 0;
    const out = await readHistory(cwd, String(req.query.sessionId), { limit, before });
    ok(res, out);
  } catch (e) { fail(res, e); }
});

app.get("/api/skills", async (req, res) => {
  try {
    const raw = String(req.query.cwd || "");
    const cwd = raw ? safePath(raw) : "";
    ok(res, await listSkills(cwd));
  } catch (e) { fail(res, e); }
});

app.get("/api/favorites", async (_req, res) => {
  try {
    const list = await pruneFavorites(async (f) => {
      try { await fsp.access(path.join(os.homedir(), ".claude", "projects", encodeCwd(f.cwd), `${f.sessionId}.jsonl`)); return true; }
      catch { return false; }
    });
    ok(res, { favorites: [...list].sort((a, b) => b.starredAt - a.starredAt) });
  } catch (e) { fail(res, e); }
});

app.post("/api/favorites", async (req, res) => {
  try {
    const { sessionId, cwd, title, starred } = req.body || {};
    if (!sessionId) throw new Error("sessionId is required");
    const r = await setFavorite({ sessionId, cwd: cwd ? safePath(cwd) : cwd, title, starred: !!starred });
    ok(res, r);
  } catch (e) { fail(res, e); }
});

app.post("/api/run", async (req, res) => {
  try {
    const { cwd, sessionId, prompt, model, permissionMode, effort } = req.body || {};
    if (!prompt?.trim()) return fail(res, new Error("پیام خالی است"));
    const dir = safePath(String(cwd || ""));
    const st = await fsp.stat(dir);
    if (!st.isDirectory()) throw new Error("مسیر پوشه نیست");
    const run = startRun({ cwd: dir, sessionId: sessionId || null, prompt, model, permissionMode, effort });
    ok(res, { runId: run.runId, sessionId: run.sessionId });
  } catch (e) { fail(res, e); }
});

app.get("/api/runs", (_req, res) => ok(res, { runs: listRuns() }));

app.post("/api/run/:runId/permission", (req, res) => {
  const { id, decision } = req.body || {};
  const r = answerPermission(req.params.runId, id, decision);
  if (!r.ok) return fail(res, new Error(r.error));
  ok(res, r);
});

app.post("/api/run/:runId/answer", (req, res) => {
  const { id, answers, cancel } = req.body || {};
  const r = answerQuestion(req.params.runId, id, answers, !!cancel);
  if (!r.ok) return fail(res, new Error(r.error));
  ok(res, r);
});

app.post("/api/run/:runId/answer", (req, res) => {
  const { id, answers, cancel } = req.body || {};
  const r = answerQuestion(req.params.runId, id, answers, !!cancel);
  if (!r.ok) return fail(res, new Error(r.error));
  ok(res, r);
});

app.post("/api/run/:runId/message", (req, res) => {
  const r = enqueueMessage(req.params.runId, String(req.body?.prompt ?? ""));
  if (!r.ok) return fail(res, new Error(r.error));
  ok(res, r);
});

app.post("/api/run/:runId/unqueue", (req, res) => {
  const r = dequeueMessage(req.params.runId, String(req.body?.id ?? ""));
  if (!r.ok) return fail(res, new Error(r.error));
  ok(res, r);
});

app.post("/api/run/:runId/stop", (req, res) => {
  ok(res, { stopped: stopRun(req.params.runId) });
});

app.get("/api/run/:runId/stream", (req, res) => {
  const run = getRun(req.params.runId);
  if (!run) return fail(res, new Error("Run not found"), 404);

  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const from = Number(req.query.from || 0);
  const send = (ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`);

  for (const ev of run.events.slice(from)) send(ev);
  if (run.status !== "running") {
    send({ type: "runner_done", status: run.status, sessionId: run.sessionId });
    return res.end();
  }

  const unsub = subscribe(run, (ev) => {
    send(ev);
    if (ev.type === "runner_done") { unsub(); res.end(); }
  });
  const ping = setInterval(() => res.write(": ping\n\n"), 15000);
  req.on("close", () => { clearInterval(ping); unsub(); });
  res.on("close", () => { clearInterval(ping); unsub(); });
});

app.get("/api/fs", async (req, res) => {
  try {
    ok(res, await listDir(String(req.query.path || os.homedir()), { showHidden: req.query.hidden === "1" }));
  } catch (e) { fail(res, e); }
});

app.get("/api/file", async (req, res) => {
  try { ok(res, await readFileText(String(req.query.path || ""))); } catch (e) { fail(res, e); }
});

app.get("/api/usage", async (req, res) => {
  try { ok(res, await getUsage({ force: req.query.force === "1" })); }
  catch (e) { fail(res, e); }
});

const IMAGE_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".heic": "image/heic",
};

app.get("/api/thumb", async (req, res) => {
  try {
    const target = safePath(String(req.query.path || ""));
    if (!target.startsWith(UPLOAD_ROOT + path.sep)) throw new Error("Not an uploaded file");
    const type = IMAGE_TYPES[path.extname(target).toLowerCase()];
    if (!type) throw new Error("Not an image");
    const stat = await fsp.stat(target);
    if (!stat.isFile() || stat.size > 25 * 1024 * 1024) throw new Error("Unavailable");
    res.set("Content-Type", type);
    res.set("Cache-Control", "private, max-age=300");
    fs.createReadStream(target).pipe(res);
  } catch (e) { fail(res, e, 404); }
});

app.get("/api/ports", async (_req, res) => {
  try { ok(res, { ports: await listPorts(), self: PORT }); } catch (e) { fail(res, e); }
});

app.post("/api/upload", (req, res) => {
  const bb = busboy({ headers: req.headers, limits: { fileSize: 200 * 1024 * 1024, files: 10 } });
  const saved = [];
  const pending = [];
  let targetDir = UPLOAD_ROOT;

  bb.on("field", (name, val) => {
    if (name === "dir" && val) {
      try { targetDir = safePath(val); } catch {}
    }
  });

  bb.on("file", (_name, file, info) => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const nonce = crypto.randomBytes(3).toString("hex");
    const clean = (info.filename || "file").replace(/[/\\]/g, "_").replace(/[^\w.\-؀-ۿ ]/g, "_");
    const dest = path.join(targetDir, `${stamp}-${nonce}__${clean}`);
    pending.push(new Promise((resolve, reject) => {
      fsp.mkdir(targetDir, { recursive: true })
        .then(() => {
          const ws = fs.createWriteStream(dest);
          file.pipe(ws);
          ws.on("finish", () => { saved.push({ path: dest, name: clean, mime: info.mimeType }); resolve(); });
          ws.on("error", reject);
        })
        .catch(reject);
    }));
  });

  bb.on("error", (e) => fail(res, e));
  bb.on("close", async () => {
    try { await Promise.all(pending); ok(res, { files: saved }); } catch (e) { fail(res, e); }
  });

  req.pipe(bb);
});

const PUBLIC_DIR = path.join(__dirname, "public");

async function assetVersion() {
  const stamps = await Promise.all(
    ["app.js", "style.css"].map((f) => fsp.stat(path.join(PUBLIC_DIR, f)).then((st) => st.mtimeMs).catch(() => 0))
  );
  return Math.max(...stamps).toString(36);
}

async function sendShell(_req, res) {
  try {
    const [html, v] = await Promise.all([
      fsp.readFile(path.join(PUBLIC_DIR, "index.html"), "utf8"),
      assetVersion(),
    ]);
    res.set("Cache-Control", "no-store");
    res.type("html").send(html.replace(/\/(app\.js|style\.css)/g, `/$1?v=${v}`));
  } catch (e) {
    fail(res, e, 500);
  }
}

const APP_DIST = path.join(__dirname, "app", "dist");
const HAS_APP = fs.existsSync(path.join(APP_DIST, "index.html"));

if (HAS_APP) {
  app.use("/assets", express.static(path.join(APP_DIST, "assets"), { etag: true, maxAge: "1y" }));
  app.get("/", (_req, res) => {
    res.set("Cache-Control", "no-store");
    res.sendFile(path.join(APP_DIST, "index.html"));
  });
  app.get("/legacy", sendShell);
} else {
  app.get("/", sendShell);
}

app.get("/sw.js", (_req, res) => {
  res.set("Cache-Control", "no-store");
  res.set("Service-Worker-Allowed", "/");
  res.type("application/javascript").sendFile(path.join(PUBLIC_DIR, "sw.js"));
});

app.get("/manifest.webmanifest", (_req, res) => {
  res.set("Cache-Control", "no-cache");
  res.type("application/manifest+json").sendFile(path.join(PUBLIC_DIR, "manifest.webmanifest"));
});

app.use(express.static(PUBLIC_DIR, { index: false, etag: true, maxAge: "1y" }));
app.get(/.*/, (req, res) => {
  if (HAS_APP && !req.path.startsWith("/legacy")) {
    res.set("Cache-Control", "no-store");
    return res.sendFile(path.join(APP_DIST, "index.html"));
  }
  return sendShell(req, res);
});

app.listen(PORT, HOST, () => {
  console.log(`claude-remote → http://${HOST}:${PORT}`);
  console.log(`serving: ${HAS_APP ? "app/dist" : "public (legacy)"}`);
  console.log(`token: ${TOKEN}`);
});
