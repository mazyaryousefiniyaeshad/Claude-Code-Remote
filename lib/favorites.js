import fsp from "node:fs/promises";
import path from "node:path";
import { FAVORITES_FILE } from "./config.js";

const FILE = FAVORITES_FILE;
const MAX = 200;

let cache = null;
let writing = Promise.resolve();

async function load() {
  if (cache) return cache;
  try {
    const raw = await fsp.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function persist() {
  const snapshot = JSON.stringify(cache, null, 2);
  writing = writing.then(async () => {
    await fsp.mkdir(path.dirname(FILE), { recursive: true });
    const tmp = FILE + ".tmp";
    await fsp.writeFile(tmp, snapshot, { mode: 0o600 });
    await fsp.rename(tmp, FILE);
  }).catch(() => {});
  return writing;
}

export async function listFavorites() {
  const all = await load();
  return [...all].sort((a, b) => b.starredAt - a.starredAt);
}

export async function isFavorite(sessionId) {
  const all = await load();
  return all.some((f) => f.sessionId === sessionId);
}

export async function favoriteIds() {
  const all = await load();
  return all.map((f) => f.sessionId);
}

export async function setFavorite({ sessionId, cwd, title, starred }) {
  const all = await load();
  const at = all.findIndex((f) => f.sessionId === sessionId);

  if (!starred) {
    if (at >= 0) {
      all.splice(at, 1);
      await persist();
    }
    return { starred: false };
  }

  const entry = {
    sessionId,
    cwd,
    title: title || "Untitled",
    starredAt: at >= 0 ? all[at].starredAt : Date.now(),
  };
  if (at >= 0) all[at] = entry;
  else all.unshift(entry);
  if (all.length > MAX) all.length = MAX;

  await persist();
  return { starred: true };
}

export async function pruneFavorites(existsCheck) {
  const all = await load();
  const keep = [];
  for (const f of all) {
    if (await existsCheck(f)) keep.push(f);
  }
  if (keep.length !== all.length) {
    cache = keep;
    await persist();
  }
  return keep;
}
