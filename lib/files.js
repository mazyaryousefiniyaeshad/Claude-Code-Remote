import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { EXTRA_ROOTS } from "./config.js";

const execAsync = promisify(exec);
const HOME = os.homedir();

const HIDDEN_ALWAYS = new Set(["node_modules", ".git", ".next", "__pycache__", ".venv", "dist", ".DS_Store"]);

const EXTRA = EXTRA_ROOTS
  .split(path.delimiter)
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => path.resolve(entry));

const ROOTS = [HOME, ...EXTRA];

function realOf(p) {
  const rest = [];
  let current = p;
  for (;;) {
    try {
      return path.join(fs.realpathSync.native(current), ...rest.reverse());
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return p;
      rest.push(path.basename(current));
      current = parent;
    }
  }
}

function isInside(root, target) {
  const rel = path.relative(root, target);
  return rel === "" || (rel.split(path.sep)[0] !== ".." && !path.isAbsolute(rel));
}

export function allowedRoots() {
  return [...ROOTS];
}

export function safePath(p) {
  const raw = String(p ?? "");
  const resolved = path.resolve(raw.startsWith("~") ? path.join(HOME, raw.slice(1)) : raw);
  const real = realOf(resolved);
  const ok = ROOTS.some((root) => isInside(realOf(root), real));
  if (!ok) throw new Error(`Path is outside the allowed roots (${ROOTS.join(", ")})`);
  return resolved;
}

export async function listDir(dir, { showHidden = false } = {}) {
  const target = safePath(dir);
  const entries = await fsp.readdir(target, { withFileTypes: true });
  const items = [];
  for (const e of entries) {
    if (!showHidden && (e.name.startsWith(".") || HIDDEN_ALWAYS.has(e.name))) continue;
    const full = path.join(target, e.name);
    let size = null, mtime = null;
    try {
      const st = await fsp.stat(full);
      size = st.isFile() ? st.size : null;
      mtime = st.mtimeMs;
    } catch {}
    items.push({ name: e.name, path: full, dir: e.isDirectory(), size, mtime });
  }
  items.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
  return {
    path: target,
    parent: target === "/" ? null : path.dirname(target),
    home: HOME,
    items,
  };
}

export async function readFileText(p, maxBytes = 400_000) {
  const target = safePath(p);
  const st = await fsp.stat(target);
  if (!st.isFile()) throw new Error("Not a file");
  const truncated = st.size > maxBytes;
  const fh = await fsp.open(target, "r");
  try {
    const buf = Buffer.alloc(Math.min(st.size, maxBytes));
    await fh.read(buf, 0, buf.length, 0);
    return { path: target, size: st.size, truncated, text: buf.toString("utf8") };
  } finally {
    await fh.close();
  }
}

function collect(rows) {
  const seen = new Map();
  for (const { port, host, command, pid } of rows) {
    if (!port || port < 1) continue;
    const wildcard = ["*", "0.0.0.0", "[::]", "::"].includes(host);
    const prev = seen.get(port);
    if (!prev) seen.set(port, { port, command, pid, hosts: [host], wildcard });
    else {
      if (!prev.hosts.includes(host)) prev.hosts.push(host);
      prev.wildcard = prev.wildcard || wildcard;
    }
  }
  return [...seen.values()].sort((a, b) => a.port - b.port);
}

function splitAddress(address) {
  const at = address.lastIndexOf(":");
  return { host: address.slice(0, at), port: Number(address.slice(at + 1)) };
}

async function fromLsof() {
  const { stdout } = await execAsync("lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null || true", { timeout: 8000 });
  return stdout
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split(/\s+/))
    .filter((cols) => cols.length >= 9)
    .map((cols) => {
      const address = cols.find((c) => /:\d+$/.test(c) && (c.includes(".") || c.includes("*") || c.includes("[")));
      return address ? { ...splitAddress(address), command: cols[0], pid: Number(cols[1]) } : null;
    })
    .filter(Boolean);
}

async function fromSs() {
  const { stdout } = await execAsync("ss -ltnpH 2>/dev/null || true", { timeout: 8000 });
  return stdout
    .split("\n")
    .map((line) => line.trim().split(/\s+/))
    .filter((cols) => cols.length >= 4)
    .map((cols) => {
      const owner = cols.slice(5).join(" ").match(/\("([^"]+)",pid=(\d+)/);
      return { ...splitAddress(cols[3]), command: owner?.[1] ?? "?", pid: Number(owner?.[2] ?? 0) };
    });
}

async function fromNetstat() {
  const [{ stdout }, tasks] = await Promise.all([
    execAsync("netstat -ano", { timeout: 8000 }),
    execAsync("tasklist /FO CSV /NH", { timeout: 8000 }).catch(() => ({ stdout: "" })),
  ]);
  const names = new Map();
  for (const line of tasks.stdout.split(/\r?\n/)) {
    const match = line.match(/^"([^"]+)","(\d+)"/);
    if (match) names.set(Number(match[2]), match[1].replace(/\.exe$/i, ""));
  }
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((cols) => cols[0] === "TCP" && /^(0\.0\.0\.0|\[::\]):0$/.test(cols[2] ?? ""))
    .map((cols) => {
      const pid = Number(cols[cols.length - 1]);
      return { ...splitAddress(cols[1]), command: names.get(pid) ?? "?", pid };
    });
}

export async function listPorts() {
  try {
    if (process.platform === "win32") return collect(await fromNetstat());
    const rows = await fromLsof();
    return collect(rows.length ? rows : await fromSs());
  } catch {
    return [];
  }
}
