export type RunStatus = "running" | "done" | "error" | "stopped";

export interface Project {
  slug: string;
  cwd: string;
  name: string;
  sessionCount: number;
  mtime: number;
  exists: boolean;
}

export interface SessionSummary {
  id: string;
  cwd: string;
  title: string;
  firstPrompt: string | null;
  mtime: number;
  size: number;
  userCount: number;
  assistantCount: number;
  starred?: boolean;
}

export interface Favorite {
  sessionId: string;
  cwd: string;
  title: string;
  starredAt: number;
}

export interface ToolResult {
  isError: boolean;
  text: string;
}

export type MessagePart =
  | { kind: "text"; text: string }
  | { kind: "thinking"; text: string }
  | { kind: "image" }
  | {
      kind: "tool";
      id?: string;
      name: string;
      input: Record<string, unknown>;
      result?: ToolResult;
    };

export interface Message {
  role: "user" | "assistant";
  parts: MessagePart[];
  timestamp?: string;
  uuid?: string;
}

export interface History {
  messages: Message[];
  total: number;
  offset: number;
  hasMore: boolean;
}

export interface QuestionOption {
  label: string;
  description: string;
}

export interface Question {
  header: string;
  question: string;
  multiSelect: boolean;
  options: QuestionOption[];
}

export interface PendingQuestion {
  id: string;
  kind: "question";
  questions: Question[];
}

export interface PendingPermission {
  id: string;
  kind: "permission";
  toolName: string;
  input: Record<string, unknown>;
  title: string | null;
  displayName: string;
  description: string | null;
  blockedPath: string | null;
  decisionReason: string | null;
  canAlwaysAllow: boolean;
}

export type Pending = PendingQuestion | PendingPermission;

export interface QueuedMessage {
  id: string;
  prompt: string;
}

export interface Run {
  runId: string;
  sessionId: string | null;
  cwd: string;
  status: RunStatus;
  startedAt: number;
  prompt: string;
  pending: Pending[];
  queued: QueuedMessage[];
}

export interface FsEntry {
  name: string;
  path: string;
  dir: boolean;
  size: number | null;
  mtime: number | null;
}

export interface FsListing {
  path: string;
  parent: string | null;
  home: string;
  items: FsEntry[];
}

export interface PortEntry {
  port: number;
  command: string;
  pid: number;
  hosts: string[];
  wildcard: boolean;
}

export interface UsageWindow {
  utilization: number;
  resetsAt: string | null;
}

export interface UsageLimit {
  key: string;
  label: string;
  scope: string | null;
  utilization: number;
  resetsAt: string | null;
  severity: string;
  isActive: boolean;
}

export interface Usage {
  available: boolean;
  plan?: string | null;
  fiveHour?: UsageWindow | null;
  sevenDay?: UsageWindow | null;
  limits?: UsageLimit[];
  fetchedAt?: number;
  error?: string;
}

export interface Attachment {
  path: string;
  name: string;
  mime: string;
}

export type PermissionMode =
  | "default"
  | "auto"
  | "acceptEdits"
  | "plan"
  | "bypassPermissions";

export type Effort = "" | "low" | "medium" | "high" | "xhigh" | "max";

export interface RunOptions {
  model: string;
  permissionMode: PermissionMode;
  effort: Effort;
}

export interface StartedRun {
  runId: string;
  sessionId: string | null;
}

export type SkillSource = "project" | "personal" | "plugin";

export interface Skill {
  id: string;
  name: string;
  description: string;
  source: SkillSource;
  tags: string[];
  modelInvocable: boolean;
}

export interface SkillTag {
  tag: string;
  count: number;
}
