const KEYS = {
  token: "cr_token",
  server: "cr_server",
  theme: "cr_theme",
  model: "cr_model",
  permission: "cr_perm",
  effort: "cr_effort",
  fontScale: "cr_font",
  enterKey: "cr_enter",
  activeRun: "cr_active_run",
} as const;

type Key = keyof typeof KEYS;

function read(key: Key): string | null {
  try {
    return localStorage.getItem(KEYS[key]);
  } catch {
    return null;
  }
}

function write(key: Key, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(KEYS[key]);
    else localStorage.setItem(KEYS[key], value);
  } catch {
    return;
  }
}

export const readToken = () => read("token");
export const writeToken = (value: string | null) => write("token", value);

export const readServer = () => read("server") ?? "";
export const writeServer = (value: string | null) => write("server", value);

export const readTheme = () => read("theme");
export const writeTheme = (value: string) => write("theme", value);

export type EnterMode = "auto" | "send" | "newline";

export function readEnterMode(): EnterMode {
  const value = read("enterKey");
  return value === "send" || value === "newline" ? value : "auto";
}

export const writeEnterMode = (value: EnterMode) => write("enterKey", value);

export function enterSends(): boolean {
  const mode = readEnterMode();
  if (mode === "send") return true;
  if (mode === "newline") return false;
  try {
    return !window.matchMedia("(pointer: coarse)").matches;
  } catch {
    return false;
  }
}

export const readFontScale = () => Number(read("fontScale")) || 14;
export const writeFontScale = (value: number) => write("fontScale", String(value));

export interface ActiveRun {
  runId: string;
  sessionId: string | null;
  cwd: string;
}

export function readActiveRun(): ActiveRun | null {
  const raw = read("activeRun");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ActiveRun;
  } catch {
    return null;
  }
}

export const writeActiveRun = (value: ActiveRun | null) =>
  write("activeRun", value ? JSON.stringify(value) : null);

export function readRunOptions() {
  return {
    model: read("model") ?? "",
    permissionMode: (read("permission") ?? "default") as import("../api/types").PermissionMode,
    effort: (read("effort") ?? "") as import("../api/types").Effort,
  };
}

export function writeRunOption(key: "model" | "permission" | "effort", value: string) {
  write(key, value);
}
