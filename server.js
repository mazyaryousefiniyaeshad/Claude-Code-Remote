import express from "express";
import busboy from "busboy";
import compression from "compression";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import { listWorkspaces, listSessions, readHistory, sessionExists } from "./lib/sessions.js";
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
const HOST = process.env.HOST || "127.0.0.1";
const UPLOAD_ROOT = path.join(os.homedir(), ".claude-remote", "uploads");
const TOKEN_FILE = path.join(os.homedir(), ".claude-remote", "token");

await fsp.mkdir(UPLOAD_ROOT, { recursive: true });

async function loadToken() {
  if (process.env.CLAUDE_REMOTE_TOKEN) return { token: process.env.CLAUDE_REMOTE_TOKEN, source: "env" };
  try {
    const t = (await fsp.readFile(TOKEN_FILE, "utf8")).trim();
    if (t) return { token: t, source: "file" };
  } catch {}
  const t = crypto.randomBytes(18).toString("base64url");
  await fsp.mkdir(path.dirname(TOKEN_FILE), { recursive: true });
  await fsp.writeFile(TOKEN_FILE, t + "\n", { mode: 0o600 });
  return { token: t, source: "new" };
}
const { token: TOKEN, source: TOKEN_SOURCE } = await loadToken();

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
  return req.get("x-auth-token") || null;
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
  const given = Buffer.from(t || "");
  const expected = Buffer.from(TOKEN);
  if (given.length === expected.length && crypto.timingSafeEqual(given, expected)) return next();
  res.status(401).json({ error: "Invalid token" });
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
    const list = await pruneFavorites((f) => sessionExists(f.cwd, f.sessionId));
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
    if (!prompt?.trim()) return fail(res, new Error("Message is empty"));
    const dir = safePath(String(cwd || ""));
    const st = await fsp.stat(dir);
    if (!st.isDirectory()) throw new Error("Path is not a folder");
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

const APP_DIST = path.join(__dirname, "app", "dist");
const APP_INDEX = path.join(APP_DIST, "index.html");
const HAS_APP = fs.existsSync(APP_INDEX);

function sendApp(_req, res) {
  if (!HAS_APP) {
    return res.status(503).type("text").send("The web app is not built yet. Run: cd app && npm install && npm run build");
  }
  res.set("Cache-Control", "no-store");
  res.sendFile(APP_INDEX);
}

app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

app.use("/assets", express.static(path.join(APP_DIST, "assets"), { etag: true, maxAge: "1y", immutable: true }));

app.get("/sw.js", (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/manifest.webmanifest", (_req, res, next) => {
  res.set("Cache-Control", "no-cache");
  res.type("application/manifest+json");
  next();
});

app.use(express.static(APP_DIST, { index: false, etag: true, maxAge: "1d" }));
app.get(/.*/, sendApp);

app.listen(PORT, HOST, () => {
  console.log(`claude-remote → http://${HOST}:${PORT}`);
  if (!HAS_APP) console.log("web app not built: run `cd app && npm install && npm run build`");
  if (TOKEN_SOURCE === "new") console.log(`token: ${TOKEN} (saved to ${TOKEN_FILE})`);
  else if (TOKEN_SOURCE === "file") console.log(`token: in ${TOKEN_FILE}`);
  else console.log("token: from CLAUDE_REMOTE_TOKEN");
});
