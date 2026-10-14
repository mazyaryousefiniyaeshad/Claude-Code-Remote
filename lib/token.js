import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { TOKEN_FILE, TOKEN_FROM_ENV } from "./config.js";

function save(token) {
  fs.mkdirSync(path.dirname(TOKEN_FILE), { recursive: true });
  fs.writeFileSync(TOKEN_FILE, token + "\n", { mode: 0o600 });
  return token;
}

export function readToken() {
  if (TOKEN_FROM_ENV) return { token: TOKEN_FROM_ENV, source: "env" };
  try {
    const token = fs.readFileSync(TOKEN_FILE, "utf8").trim();
    if (token) return { token, source: "file" };
  } catch {
    return null;
  }
  return null;
}

export function ensureToken() {
  return readToken() ?? { token: save(crypto.randomBytes(18).toString("base64url")), source: "new" };
}

export function resetToken() {
  return save(crypto.randomBytes(18).toString("base64url"));
}
