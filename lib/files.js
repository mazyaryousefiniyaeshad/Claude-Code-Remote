import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const HOME = os.homedir();

const HIDDEN_ALWAYS = new Set(["node_modules", ".git", ".next", "__pycache__", ".venv", "dist", ".DS_Store"]);

const EXTRA_ROOTS = (process.env.CR_ALLOWED_ROOTS || "")
  .split(":")
  .map((entry) => entry.trim())
  .filter(Boolean)
  .map((entry) => path.resolve(entry));

const ROOTS = [HOME, "/Volumes", ...EXTRA_ROOTS];

export function allowedRoots() {
  return [...ROOTS];
}

export function safePath(p) {
  const raw = String(p ?? "");
  const resolved = path.resolve(raw.startsWith("~") ? path.join(HOME, raw.slice(1)) : raw);
  const ok = ROOTS.some((root) => resolved === root || resolved.startsWith(root + path.sep));
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
  if (!st.isFile()) throw new Error("فایل نیست");
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

export async function listPorts() {
  try {
    const { stdout } = await execAsync("lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null || true", { timeout: 8000 });
    const seen = new Map();
    for (const line of stdout.split("\n").slice(1)) {
      const cols = line.trim().split(/\s+/);
      if (cols.length < 9) continue;
      const command = cols[0];
      const name = cols[cols.length - 2] === "(LISTEN)" ? cols[cols.length - 2] : cols[8];
      const addr = cols.find((c) => /:\d+$/.test(c) && (c.includes(".") || c.includes("*") || c.includes("[")));
      if (!addr) continue;
      const port = Number(addr.split(":").pop());
      if (!port || port < 1) continue;
      const host = addr.slice(0, addr.lastIndexOf(":"));
      const prev = seen.get(port);
      const wildcard = host === "*" || host === "0.0.0.0" || host === "[::]";
      if (!prev) seen.set(port, { port, command, pid: Number(cols[1]), hosts: [host], wildcard });
      else {
        if (!prev.hosts.includes(host)) prev.hosts.push(host);
        prev.wildcard = prev.wildcard || wildcard;
      }
    }
    return [...seen.values()].sort((a, b) => a.port - b.port);
  } catch {
    return [];
  }
}
