import { query } from "@anthropic-ai/claude-agent-sdk";
import os from "node:os";

const TTL_MS = Number(process.env.USAGE_TTL_MS || 60_000);
const FETCH_TIMEOUT_MS = 20_000;

let cache = { at: 0, data: null };
let inFlight = null;

async function fetchUsage() {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);

  const q = query({
    prompt: "noop",
    options: {
      cwd: os.homedir(),
      abortController: abort,
      permissionMode: "plan",
      settingSources: [],
      tools: [],
    },
  });

  try {
    for await (const m of q) {
      if (m.type !== "system" || m.subtype !== "init") continue;
      const raw = await q.usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET();
      abort.abort();
      return shape(raw);
    }
    return shape(null);
  } finally {
    clearTimeout(timer);
    try { abort.abort(); } catch {}
  }
}

function win(w) {
  if (!w || w.utilization == null) return null;
  return {
    utilization: Math.max(0, Math.min(100, Math.round(w.utilization))),
    resetsAt: w.resets_at || null,
  };
}

const KIND_LABELS = {
  session: "5 hours",
  weekly_all: "7 days",
  weekly_scoped: "7 days",
};

function labelOf(entry) {
  const base = KIND_LABELS[entry.kind] || entry.kind || "Limit";
  const model = entry.scope?.model?.display_name;
  const surface = entry.scope?.surface?.display_name;
  const suffix = [model, surface].filter(Boolean).join(" · ");
  return suffix ? `${base} · ${suffix}` : base;
}

function limitsOf(raw) {
  const rows = raw.rate_limits?.limits;
  if (!Array.isArray(rows)) return [];
  return rows
    .filter((entry) => entry && entry.percent != null)
    .map((entry, index) => ({
      key: `${entry.kind || "limit"}-${index}`,
      label: labelOf(entry),
      scope: entry.scope?.model?.display_name || null,
      utilization: Math.max(0, Math.min(100, Math.round(entry.percent))),
      resetsAt: entry.resets_at || null,
      severity: entry.severity || "normal",
      isActive: !!entry.is_active,
    }));
}

function shape(raw) {
  if (!raw) {
    return { available: false, plan: null, fiveHour: null, sevenDay: null, limits: [], fetchedAt: Date.now() };
  }
  const limits = limitsOf(raw);
  const fiveHour = win(raw.rate_limits?.five_hour);
  const sevenDay = win(raw.rate_limits?.seven_day);
  return {
    available: !!raw.rate_limits_available,
    plan: raw.subscription_type || null,
    fiveHour,
    sevenDay,
    limits: limits.length
      ? limits
      : [
          fiveHour ? { key: "session-0", label: "5 hours", scope: null, ...fiveHour, severity: "normal", isActive: false } : null,
          sevenDay ? { key: "weekly_all-1", label: "7 days", scope: null, ...sevenDay, severity: "normal", isActive: false } : null,
        ].filter(Boolean),
    fetchedAt: Date.now(),
  };
}

export async function getUsage({ force = false } = {}) {
  if (!force && cache.data && Date.now() - cache.at < TTL_MS) return cache.data;
  if (inFlight) return inFlight;

  inFlight = fetchUsage()
    .then((data) => {
      cache = { at: Date.now(), data };
      return data;
    })
    .catch((err) => {
      if (cache.data) return cache.data;
      return { available: false, plan: null, fiveHour: null, sevenDay: null, limits: [], error: String(err?.message || err), fetchedAt: Date.now() };
    })
    .finally(() => { inFlight = null; });

  return inFlight;
}
