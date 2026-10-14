import { writeServer, writeToken } from "./storage";

export interface Pairing {
  server: string;
  token: string;
}

export function parsePairing(text: string): Pairing | null {
  const value = text.trim();
  const at = value.indexOf("#pair=");
  if (at < 0) return null;
  let token = value.slice(at + "#pair=".length);
  try {
    token = decodeURIComponent(token);
  } catch {
    return null;
  }
  token = token.trim();
  const server = value.slice(0, at).replace(/\/+$/, "");
  return token ? { server, token } : null;
}

export function consumePairingHash(): boolean {
  const pairing = parsePairing(window.location.hash);
  if (!window.location.hash.startsWith("#pair=")) return false;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (!pairing) return false;
  writeToken(pairing.token);
  writeServer(null);
  return true;
}
