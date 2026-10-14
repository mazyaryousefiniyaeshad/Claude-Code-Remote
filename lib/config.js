import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = process.env;
const HOME = os.homedir();
const LEGACY_DIR = path.join(HOME, ".claude-remote");

export const DEFAULT_PORT = 61777;
export const DATA_DIR = env.CC_REMOTE_HOME || path.join(HOME, ".cc-remote");
export const CONFIG_FILE = path.join(DATA_DIR, "config.json");
export const UPLOAD_ROOT = path.join(DATA_DIR, "uploads");
export const TOKEN_FILE = path.join(DATA_DIR, "token");
export const FAVORITES_FILE = path.join(DATA_DIR, "favorites.json");
export const LOG_DIR = path.join(DATA_DIR, "logs");
export const LOG_FILE = path.join(LOG_DIR, "server.log");
export const PID_FILE = path.join(DATA_DIR, "server.pid");

function adoptLegacy() {
  if (env.CC_REMOTE_HOME || fs.existsSync(TOKEN_FILE) || !fs.existsSync(LEGACY_DIR)) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    for (const name of ["token", "favorites.json"]) {
      const from = path.join(LEGACY_DIR, name);
      if (fs.existsSync(from)) fs.copyFileSync(from, path.join(DATA_DIR, name));
    }
  } catch {
    return;
  }
}

export function readConfig() {
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeConfig(next) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2) + "\n", { mode: 0o600 });
}

adoptLegacy();
const file = readConfig();
for (const [key, value] of Object.entries(file.env ?? {})) {
  if (env[key] === undefined) env[key] = String(value);
}

export const PORT = Number(env.CC_REMOTE_PORT ?? env.PORT ?? file.port ?? DEFAULT_PORT);
export const HOST = env.CC_REMOTE_HOST || env.HOST || file.host || "127.0.0.1";
export const TOKEN_FROM_ENV = env.CC_REMOTE_TOKEN || env.CLAUDE_REMOTE_TOKEN || "";
export const EXTRA_ROOTS = env.CC_REMOTE_ROOTS ?? env.CR_ALLOWED_ROOTS ?? (Array.isArray(file.roots) ? file.roots.join(path.delimiter) : "");
