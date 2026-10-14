import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TOKEN = "test-token-1234567890";
const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "cr-home-")));
const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "cr-outside-")));
const project = path.join(home, "work");
const sessionId = "11111111-2222-3333-4444-555555555555";
let child;
let base;

function encode(cwd) {
  return cwd.replace(/[^a-zA-Z0-9]/g, "-");
}

const get = (url, headers = { Authorization: `Bearer ${TOKEN}` }) => fetch(base + url, { headers });

before(async () => {
  fs.mkdirSync(project, { recursive: true });
  fs.writeFileSync(path.join(outside, "secret.txt"), "outside");
  const projectDir = path.join(home, ".claude", "projects", encode(project));
  fs.mkdirSync(projectDir, { recursive: true });
  const lines = [
    { type: "user", cwd: project, uuid: "u1", timestamp: "2026-01-01T00:00:00Z", message: { role: "user", content: "hello there" } },
    { type: "assistant", cwd: project, uuid: "a1", timestamp: "2026-01-01T00:00:01Z", message: { role: "assistant", content: [{ type: "text", text: "general kenobi" }] } },
  ];
  fs.writeFileSync(path.join(projectDir, `${sessionId}.jsonl`), lines.map((line) => JSON.stringify(line)).join("\n") + "\n");

  child = spawn(process.execPath, ["server.js"], {
    cwd: ROOT,
    env: { ...process.env, HOME: home, USERPROFILE: home, PORT: "0", HOST: "127.0.0.1", CLAUDE_REMOTE_TOKEN: TOKEN, CR_ALLOWED_ROOTS: "" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  base = await new Promise((resolve, reject) => {
    let out = "";
    const timer = setTimeout(() => reject(new Error(`server did not start: ${out}`)), 15000);
    const onData = (chunk) => {
      out += chunk;
      const match = out.match(/http:\/\/127\.0\.0\.1:(\d+)/);
      if (match) {
        clearTimeout(timer);
        resolve(`http://127.0.0.1:${match[1]}`);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => reject(new Error(`server exited ${code}: ${out}`)));
  });
});

after(() => {
  child?.kill();
  fs.rmSync(home, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test("rejects requests without a valid token", async () => {
  assert.equal((await get("/api/health", {})).status, 401);
  assert.equal((await get("/api/health", { Authorization: "Bearer wrong" })).status, 401);
  assert.equal((await get("/api/health", { Authorization: "Bearer test-token-123456789é" })).status, 401);
});

test("does not accept the token in the query string", async () => {
  assert.equal((await get(`/api/health?token=${TOKEN}`, {})).status, 401);
});

test("accepts the token in the Authorization header", async () => {
  const res = await get("/api/health");
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test("lists folders inside home", async () => {
  const res = await get(`/api/fs?path=${encodeURIComponent(home)}`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(body.items.some((item) => item.name === "work"));
});

test("refuses paths outside the allowed roots", async () => {
  const res = await get(`/api/file?path=${encodeURIComponent(path.join(outside, "secret.txt"))}`);
  assert.equal(res.status, 400);
});

test("refuses symlinks that point outside the allowed roots", { skip: process.platform === "win32" }, async () => {
  const link = path.join(home, "escape");
  fs.symlinkSync(outside, link);
  const res = await get(`/api/file?path=${encodeURIComponent(path.join(link, "secret.txt"))}`);
  assert.equal(res.status, 400);
});

test("finds workspaces and reads session history", async () => {
  const workspaces = await (await get("/api/workspaces")).json();
  assert.ok(workspaces.workspaces.some((workspace) => workspace.cwd === project));

  const sessions = await (await get(`/api/sessions?cwd=${encodeURIComponent(project)}`)).json();
  assert.equal(sessions.sessions[0].id, sessionId);

  const history = await (await get(`/api/history?cwd=${encodeURIComponent(project)}&sessionId=${sessionId}`)).json();
  assert.deepEqual(history.messages.map((message) => message.role), ["user", "assistant"]);
});

test("reports a missing session cleanly", async () => {
  const res = await get(`/api/history?cwd=${encodeURIComponent(project)}&sessionId=nope`);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, "Session not found");
  const traversal = await get(`/api/history?cwd=${encodeURIComponent(project)}&sessionId=..%2F..%2Fx`);
  assert.equal((await traversal.json()).error, "Session not found");
});

test("unknown API routes return 404 JSON", async () => {
  const res = await get("/api/nope");
  assert.equal(res.status, 404);
});
