import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const env = process.env;
const HOME = os.homedir();
const LEGACY_DIR = path.join(HOME, ".claude-remote");
const DEFAULT_DIR = path.join(HOME, ".cc-remote");

export const DATA_DIR =
  env.CC_REMOTE_HOME || (!fs.existsSync(DEFAULT_DIR) && fs.existsSync(LEGACY_DIR) ? LEGACY_DIR : DEFAULT_DIR);
export const UPLOAD_ROOT = path.join(DATA_DIR, "uploads");
export const TOKEN_FILE = path.join(DATA_DIR, "token");
export const FAVORITES_FILE = path.join(DATA_DIR, "favorites.json");

export const PORT = Number(env.CC_REMOTE_PORT ?? env.PORT ?? 61777);
export const HOST = env.CC_REMOTE_HOST || env.HOST || "127.0.0.1";
export const TOKEN_FROM_ENV = env.CC_REMOTE_TOKEN || env.CLAUDE_REMOTE_TOKEN || "";
export const EXTRA_ROOTS = env.CC_REMOTE_ROOTS ?? env.CR_ALLOWED_ROOTS ?? "";
