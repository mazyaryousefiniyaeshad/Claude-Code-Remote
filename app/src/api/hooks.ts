import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  Favorite,
  FsListing,
  History,
  PortEntry,
  Project,
  Run,
  RunOptions,
  SessionSummary,
  StartedRun,
  Skill,
  SkillTag,
  Usage,
} from "./types";

export const keys = {
  projects: ["projects"] as const,
  sessions: (cwd: string) => ["sessions", cwd] as const,
  history: (cwd: string, sessionId: string) => ["history", cwd, sessionId] as const,
  runs: ["runs"] as const,
  favorites: ["favorites"] as const,
  ports: ["ports"] as const,
  usage: ["usage"] as const,
  fs: (path: string) => ["fs", path] as const,
  skills: (cwd: string) => ["skills", cwd] as const,
};

export function useProjects() {
  return useQuery({
    queryKey: keys.projects,
    queryFn: () => api.get<{ workspaces: Project[] }>("/workspaces"),
    select: (data) => data.workspaces,
  });
}

export function useSessions(cwd: string | null) {
  return useQuery({
    queryKey: keys.sessions(cwd ?? ""),
    queryFn: () =>
      api.get<{ sessions: SessionSummary[] }>(`/sessions?cwd=${encodeURIComponent(cwd ?? "")}`),
    select: (data) => data.sessions,
    enabled: Boolean(cwd),
  });
}

export function useRuns(pollMs = 0) {
  return useQuery({
    queryKey: keys.runs,
    queryFn: () => api.get<{ runs: Run[] }>("/runs"),
    select: (data) => data.runs,
    refetchInterval: pollMs || false,
    refetchIntervalInBackground: false,
  });
}

export function useFavorites() {
  return useQuery({
    queryKey: keys.favorites,
    queryFn: () => api.get<{ favorites: Favorite[] }>("/favorites"),
    select: (data) => data.favorites,
  });
}

export function useToggleFavorite() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { sessionId: string; cwd: string; title: string; starred: boolean }) =>
      api.post<{ starred: boolean }>("/favorites", input),
    onSuccess: (_result, variables) => {
      client.invalidateQueries({ queryKey: keys.favorites });
      client.invalidateQueries({ queryKey: keys.sessions(variables.cwd) });
    },
  });
}

export function usePorts(enabled: boolean) {
  return useQuery({
    queryKey: keys.ports,
    queryFn: () => api.get<{ ports: PortEntry[]; self: number }>("/ports"),
    enabled,
  });
}

export function useSkills(cwd: string | null) {
  return useQuery({
    queryKey: keys.skills(cwd ?? ""),
    queryFn: () =>
      api.get<{ skills: Skill[]; tags: SkillTag[] }>(`/skills?cwd=${encodeURIComponent(cwd ?? "")}`),
    enabled: Boolean(cwd),
    staleTime: 60_000,
  });
}

export function useUsage() {
  return useQuery({
    queryKey: keys.usage,
    queryFn: () => api.get<Usage>("/usage"),
    staleTime: 60_000,
    retry: false,
  });
}

export function useDirectory(path: string | null) {
  return useQuery({
    queryKey: keys.fs(path ?? "~"),
    queryFn: () => api.get<FsListing>(`/fs?path=${encodeURIComponent(path ?? "~")}`),
    enabled: path !== null,
  });
}

export const HISTORY_PAGE = 40;

export function fetchHistory(cwd: string, sessionId: string, before = 0) {
  const params = new URLSearchParams({
    cwd,
    sessionId,
    limit: String(HISTORY_PAGE),
  });
  if (before > 0) params.set("before", String(before));
  return api.get<History>(`/history?${params.toString()}`);
}

export function useHistory(cwd: string | null, sessionId: string | null) {
  return useQuery({
    queryKey: keys.history(cwd ?? "", sessionId ?? ""),
    queryFn: () => fetchHistory(cwd as string, sessionId as string),
    enabled: Boolean(cwd && sessionId),
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
}

export function startRun(input: {
  cwd: string;
  sessionId: string | null;
  prompt: string;
  options: RunOptions;
}) {
  return api.post<StartedRun>("/run", {
    cwd: input.cwd,
    sessionId: input.sessionId,
    prompt: input.prompt,
    ...input.options,
  });
}

export const stopRun = (runId: string) => api.post(`/run/${runId}/stop`);

export const enqueueMessage = (runId: string, prompt: string) =>
  api.post<{ id: string; position: number }>(`/run/${runId}/message`, { prompt });

export const dequeueMessage = (runId: string, id: string) =>
  api.post(`/run/${runId}/unqueue`, { id });

export const answerPermission = (runId: string, id: string, decision: "allow" | "always" | "deny") =>
  api.post(`/run/${runId}/permission`, { id, decision });

export const answerQuestion = (
  runId: string,
  id: string,
  answers: { selected: string[]; other: string }[],
) => api.post(`/run/${runId}/answer`, { id, answers });

export const skipQuestion = (runId: string, id: string) =>
  api.post(`/run/${runId}/answer`, { id, cancel: true });
