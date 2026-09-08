import type { Effort, PermissionMode } from "../../api/types";

export interface ModeEntry {
  id: PermissionMode;
  label: string;
  hint: string;
}

export const MODES: ModeEntry[] = [
  { id: "default", label: "Ask me", hint: "Stops and asks before writing files or running new commands." },
  { id: "auto", label: "Auto", hint: "Decides on its own, still asks for risky steps." },
  { id: "acceptEdits", label: "Accept edits", hint: "Edits files freely, still asks for commands." },
  { id: "plan", label: "Plan only", hint: "Reads and plans, changes nothing." },
  { id: "bypassPermissions", label: "Never ask", hint: "Runs everything with no prompts. Full trust." },
];

export interface EffortEntry {
  id: Effort;
  label: string;
  short: string;
  hint: string;
  level: number;
}

export const EFFORTS: EffortEntry[] = [
  { id: "", label: "Default", short: "Effort", hint: "Whatever the model is configured to use.", level: 0 },
  { id: "low", label: "Low", short: "Low", hint: "Fastest and cheapest. Good for small edits.", level: 1 },
  { id: "medium", label: "Medium", short: "Medium", hint: "Balanced. Sensible for everyday work.", level: 2 },
  { id: "high", label: "High", short: "High", hint: "Thinks longer. Use for tricky bugs and design.", level: 3 },
  { id: "xhigh", label: "Extra high", short: "X-high", hint: "Much longer reasoning. Slow and costly.", level: 4 },
  { id: "max", label: "Max", short: "Max", hint: "Everything it has. Slowest, most expensive.", level: 5 },
];

export const modeOf = (id: string) => MODES.find((entry) => entry.id === id) ?? MODES[0];
export const effortOf = (id: string) => EFFORTS.find((entry) => entry.id === (id || "")) ?? EFFORTS[0];
