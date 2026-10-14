import { readServer, readToken, writeToken } from "../lib/storage";

export const SIGNED_OUT = "cc-remote:signed-out";

function base(): string {
  const raw = readServer().trim();
  if (!raw) return "";
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

export function apiUrl(path: string): string {
  return `${base()}/api${path}`;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = readToken();
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const payload = await res.json().catch(() => null);
  if (res.status === 401 && token) {
    writeToken(null);
    window.dispatchEvent(new Event(SIGNED_OUT));
  }
  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : null) ?? res.statusText;
    throw new ApiError(message, res.status);
  }
  return payload as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
    }),
  upload: async (files: FileList | File[]) => {
    const form = new FormData();
    for (const file of Array.from(files)) form.append("files", file, file.name);
    const token = readToken();
    const res = await fetch(apiUrl("/upload"), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(String(payload?.error ?? res.statusText), res.status);
    return payload as { files: import("./types").Attachment[] };
  },
};

export function authHeaders(): Record<string, string> {
  const token = readToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchThumb(filePath: string, signal?: AbortSignal): Promise<Blob> {
  const res = await fetch(apiUrl(`/thumb?path=${encodeURIComponent(filePath)}`), { headers: authHeaders(), signal });
  if (!res.ok) throw new ApiError(res.statusText, res.status);
  return res.blob();
}

export function streamUrl(runId: string, from: number) {
  return apiUrl(`/run/${runId}/stream?from=${from}`);
}
