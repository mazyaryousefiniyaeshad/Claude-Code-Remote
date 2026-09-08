const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const app = $("#app");
const LS = localStorage;

/* ------------------------------------------------------------------ icons */
const I = {
  back: '<path d="M15 18l-6-6 6-6"/>',
  refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v6h-6"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  file: '<path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/>',
  network: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  send: '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L2 18a2 2 0 0 0 1.7 3h16.6A2 2 0 0 0 22 18L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  chevD: '<path d="M6 9l6 6 6-6"/>',
  chevR: '<path d="M9 6l6 6-6 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><path d="M12 17h.01"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/>',
  star: '<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
  paperclip: '<path d="M21.4 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3.33 3.33 0 0 1 4.71 4.71l-9.2 9.19a1.67 1.67 0 0 1-2.36-2.36l8.49-8.48"/>',
};

const svg = (n, cls = "") =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n]}</svg>`;

/* ------------------------------------------------------------------ modes */
const MODES = [
  { id: "default",           label: "Ask me",       hint: "Asks before writing files or running new commands." },
  { id: "auto",              label: "Auto",         hint: "Decides on its own, still asks for risky steps." },
  { id: "acceptEdits",       label: "Accept edits", hint: "Edits files freely, still asks for commands." },
  { id: "plan",              label: "Plan only",    hint: "Reads and plans, changes nothing." },
  { id: "bypassPermissions", label: "Never ask",    hint: "Runs everything with no prompts. Full trust." },
];
const modeOf = (id) => MODES.find((m) => m.id === id) || MODES[0];

const EFFORTS = [
  { id: "",       label: "Default", short: "Effort",  hint: "Whatever the model is configured to use." },
  { id: "low",    label: "Low",     short: "Low",     hint: "Fastest and cheapest. Good for small edits." },
  { id: "medium", label: "Medium",  short: "Medium",  hint: "Balanced. Sensible for everyday work." },
  { id: "high",   label: "High",    short: "High",    hint: "Thinks longer. Use for tricky bugs and design." },
  { id: "xhigh",  label: "Extra high", short: "X-high", hint: "Much longer reasoning. Slow and costly." },
  { id: "max",    label: "Max",     short: "Max",     hint: "Everything it has. Slowest, most expensive." },
];
const effortOf = (id) => EFFORTS.find((e) => e.id === (id || "")) || EFFORTS[0];
const EFFORT_LEVEL = { "": 0, low: 1, medium: 2, high: 3, xhigh: 4, max: 5 };

function effortBars(id) {
  const n = EFFORT_LEVEL[id || ""] ?? 0;
  const bars = [1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("");
  return `<span class="effort-bars" aria-hidden="true">${bars}</span>`;
}

/* ------------------------------------------------------------------ state */
const state = {
  token: LS.getItem("cr_token") || new URLSearchParams(location.search).get("token") || "",
  view: "projects",
  tab: "projects",
  projects: [],
  runs: [],
  favorites: [],
  historyTotal: 0,
  historyOffset: 0,
  loadingMore: false,
  usage: null,
  cwd: null,
  sessions: [],
  activeSessions: new Set(),
  sessionId: null,
  messages: [],
  live: null,
  runId: null,
  stream: null,
  runStart: 0,
  lastEventAt: 0,
  attachments: [],
  draft: "",
  opts: {
    model: LS.getItem("cr_model") || "",
    permissionMode: LS.getItem("cr_perm") || "default",
    effort: LS.getItem("cr_effort") || "",
  },
  fs: null,
  fsPick: false,
  ports: null,
  busy: false,
  error: null,
  openTools: new Set(),
  qDraft: {},
};

if (new URLSearchParams(location.search).get("token")) {
  LS.setItem("cr_token", state.token);
  history.replaceState({}, "", location.pathname);
}

const ACTIVE = "cr_active_run";
const saveActive = (o) => LS.setItem(ACTIVE, JSON.stringify(o));
const clearActive = () => LS.removeItem(ACTIVE);
const loadActive = () => { try { return JSON.parse(LS.getItem(ACTIVE) || "null"); } catch { return null; } };

/* ------------------------------------------------------------------ utils */
async function api(p, opts = {}) {
  const res = await fetch("/api" + p, {
    ...opts,
    headers: { ...(opts.headers || {}), Authorization: "Bearer " + state.token },
  });
  const data = await res.json().catch(() => ({ error: "Invalid response" }));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function toast(msg) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 2000);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch {}
    ta.remove();
  }
  toast("Path copied");
}

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const RTL_G = /[֐-׿؀-ۿ܀-ݏހ-޿ﭐ-﷿ﹰ-﻿]/g;
const LTR_G = /[A-Za-zÀ-ɏ]/g;

function dirOf(text) {
  const t = String(text ?? "");
  const r = (t.match(RTL_G) || []).length;
  const l = (t.match(LTR_G) || []).length;
  if (!r && !l) return "auto";
  if (!l) return "rtl";
  if (!r) return "ltr";
  if (r !== l) return r > l ? "rtl" : "ltr";
  return t.search(RTL_G) < t.search(LTR_G) ? "rtl" : "ltr";
}

function md(text) {
  const codes = [];
  const t = String(text ?? "").replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
    codes.push(code.replace(/\n$/, ""));
    return "@@CB" + (codes.length - 1) + "@@";
  });

  return t.split("\n").map((line) => {
    const cm = line.trim().match(/^@@CB(\d+)@@$/);
    if (cm) return `<pre dir="ltr"><code>${esc(codes[Number(cm[1])])}</code></pre>`;
    if (!line.trim()) return '<div class="sp"></div>';
    const d = dirOf(line.replace(/`[^`\n]*`/g, " "));
    const h = esc(line)
      .replace(/`([^`\n]+)`/g, '<code dir="ltr">$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>")
      .replace(/^(#{1,4})\s+(.*)$/, (_m, _x, rest) => `<b>${rest}</b>`);
    return `<div dir="${d}">${h}</div>`;
  }).join("");
}

function ago(ms) {
  const d = (Date.now() - ms) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  if (d < 604800) return `${Math.floor(d / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

const size = (b) =>
  b == null ? "" : b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB";

const clock = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

const basename = (p) => String(p || "").split("/").filter(Boolean).pop() || "/";

function until(iso) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return "now";
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return h % 24 ? `${d}d ${h % 24}h` : `${d}d`;
}

const usageLevel = (u) => (u == null ? "" : u >= 85 ? "hot" : u >= 60 ? "warm" : "cool");

/* ------------------------------------------------------------------ diff */
function lineDiff(oldStr, newStr) {
  const a = String(oldStr ?? "").split("\n");
  const b = String(newStr ?? "").split("\n");
  let s = 0;
  while (s < a.length && s < b.length && a[s] === b[s]) s++;
  let e = 0;
  while (e < a.length - s && e < b.length - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  const del = a.slice(s, a.length - e);
  const add = b.slice(s, b.length - e);
  const rows = [];
  if (s > 0) rows.push({ t: "ctx", x: a[s - 1] });
  del.forEach((x) => rows.push({ t: "del", x }));
  add.forEach((x) => rows.push({ t: "add", x }));
  return { rows, added: add.length, removed: del.length };
}

function codeBlock(rows, { cap = 60, wrap = false } = {}) {
  const body = rows.slice(0, cap)
    .map((r) => `<div class="ln ${r.t}">${r.t === "add" ? "+" : r.t === "del" ? "−" : " "} ${esc(r.x)}</div>`)
    .join("");
  const more = rows.length > cap ? `<div class="ln ctx">  ... ${rows.length - cap} more lines</div>` : "";
  return `<div class="code${wrap ? " wrap" : ""}">${body}${more}</div>`;
}

/* ------------------------------------------------------------------ tools */
function toolView(p, key) {
  const i = p.input || {};
  const n = p.name;
  const open = state.openTools.has(key);
  let sub = "";
  let counts = "";
  let body = "";

  if (n === "Edit" || n === "MultiEdit") {
    sub = basename(i.file_path);
    const edits = i.edits || [{ old_string: i.old_string, new_string: i.new_string }];
    let added = 0;
    let removed = 0;
    let rows = [];
    for (const e of edits) {
      const d = lineDiff(e.old_string, e.new_string);
      added += d.added;
      removed += d.removed;
      rows = rows.concat(d.rows);
    }
    counts = `<span class="tool-count add">+${added}</span><span class="tool-count del">−${removed}</span>`;
    body = codeBlock(rows);
  } else if (n === "Write") {
    sub = basename(i.file_path);
    const lines = String(i.content ?? "").split("\n");
    counts = `<span class="tool-count add">+${lines.length}</span>`;
    body = codeBlock(lines.map((x) => ({ t: "add", x })));
  } else if (n === "Bash" || n === "BashOutput") {
    sub = i.description || String(i.command || "").slice(0, 60);
    body = codeBlock([{ t: "ctx", x: i.command || "" }], { wrap: true });
    if (p.result?.text) body += `<div class="code-out">${esc(p.result.text.slice(0, 2000))}</div>`;
  } else if (n === "Read") {
    sub = basename(i.file_path || i.path);
  } else if (n === "Grep" || n === "Glob") {
    sub = i.pattern || "";
    if (i.path) sub += "  " + basename(i.path);
  } else if (n === "Task" || n === "Agent") {
    sub = i.description || i.subagent_type || "";
    if (i.prompt) body = codeBlock([{ t: "ctx", x: String(i.prompt).slice(0, 900) }], { wrap: true });
  } else if (n === "TodoWrite") {
    const todos = i.todos || [];
    sub = `${todos.filter((t) => t.status === "completed").length}/${todos.length} done`;
    body = codeBlock(
      todos.map((t) => ({
        t: t.status === "completed" ? "add" : "ctx",
        x: `${t.status === "completed" ? "[x]" : t.status === "in_progress" ? "[>]" : "[ ]"} ${t.content}`,
      })),
      { wrap: true }
    );
  } else {
    sub = String(i.file_path || i.path || i.url || i.query || i.command || "").slice(0, 70);
    const j = JSON.stringify(i, null, 1);
    if (j && j.length > 2) body = codeBlock([{ t: "ctx", x: j.slice(0, 1200) }], { wrap: true });
  }

  const st = p.result
    ? `<span class="tool-state ${p.result.isError ? "bad" : "ok"}">${svg(p.result.isError ? "alert" : "check")}</span>`
    : "";

  return `<div class="tool" open-state="${open ? 1 : 0}">
    <button class="tool-head" ${body ? `data-act="tool" data-key="${esc(key)}" aria-expanded="${open}"` : "disabled"}>
      <span class="tool-name">${esc(n)}</span>
      <span class="tool-sub">${esc(sub)}</span>
      ${counts}${st}
      ${body ? `<span class="tool-chev">${svg("chevD")}</span>` : ""}
    </button>
    ${body && open ? `<div class="tool-body">${body}</div>` : ""}
  </div>`;
}

function partsView(parts, mi, live = false) {
  return parts.map((p, pi) => {
    if (p.kind === "text") return `<div class="bubble">${md(p.text)}</div>`;
    if (p.kind === "thinking") {
      return `<details class="think"${live ? " open" : ""}><summary>${svg("chevR")} Thinking</summary>
        <div class="think-body" dir="${dirOf(p.text)}">${esc(p.text)}</div></details>`;
    }
    if (p.kind === "tool") return toolView(p, `${mi}-${pi}`);
    if (p.kind === "image") {
      return '<div class="tool"><button class="tool-head" disabled><span class="tool-name">Image</span></button></div>';
    }
    return "";
  }).join("");
}

/* ------------------------------------------------------------------ views */
function switcherBtn() {
  const n = state.runs.length;
  if (!n) return "";
  const waiting = state.runs.some((r) => r.pending?.length);
  return `<button class="btn-icon switcher${waiting ? " waiting" : ""}" data-act="switcher"
      aria-label="Switch between ${n} active session${n === 1 ? "" : "s"}">
    ${svg("layers")}<span class="switcher-n">${n}</span>
  </button>`;
}

function header(title, sub, { back = false, actions = "" } = {}) {
  return `<header class="hdr">
    ${back ? `<button class="btn-icon" data-act="back" aria-label="Back">${svg("back")}</button>` : ""}
    <div class="hdr-title"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</div>
    ${switcherBtn()}
    ${actions}
    <button class="btn-icon" data-act="settings" aria-label="Settings">${svg("settings")}</button>
  </header>`;
}

const iconBtn = (act, label, icon, extra = "") =>
  `<button class="btn-icon" data-act="${act}" aria-label="${label}" ${extra}>${svg(icon)}</button>`;

function tabs() {
  const n = state.runs.length;
  const waiting = state.runs.reduce((a, r) => a + (r.pending?.length || 0), 0);
  return `<div class="tabs" role="tablist">
    <button role="tab" aria-selected="${state.tab === "projects"}" data-act="tab" data-v="projects">Projects</button>
    <button role="tab" aria-selected="${state.tab === "active"}" data-act="tab" data-v="active">
      Active${n ? ` <span class="tab-count${waiting ? " urgent" : ""}">${n}</span>` : ""}
    </button>
    <button role="tab" aria-selected="${state.tab === "starred"}" data-act="tab" data-v="starred">
      Starred${state.favorites.length ? ` <span class="tab-count">${state.favorites.length}</span>` : ""}
    </button>
  </div>`;
}

function viewActive() {
  const rows = state.runs.map((r) => {
    const waiting = r.pending?.length || 0;
    return `<div class="run${waiting ? " waiting" : ""}">
      <button class="run-main" data-act="open-run" data-run="${esc(r.runId)}"
              data-cwd="${esc(r.cwd)}" data-sid="${esc(r.sessionId || "")}">
        <div class="row-title">
          <span class="txt">${esc(basename(r.cwd))}</span>
          ${waiting ? `<span class="pill urgent">needs you</span>` : `<span class="pill">running</span>`}
        </div>
        <div class="run-prompt" dir="${dirOf(r.prompt)}">${esc(r.prompt)}</div>
        <div class="row-meta">
          <span class="dot"></span>
          <span data-elapsed="${r.startedAt}">${clock((Date.now() - r.startedAt) / 1000)}</span>
          <span class="sep">&middot;</span>
          <span>${esc(r.cwd)}</span>
        </div>
      </button>
      <button class="btn-sm btn-danger run-stop" data-act="stop-run" data-run="${esc(r.runId)}">Stop</button>
    </div>`;
  }).join("");

  return header("Claude Remote", "Runs happening right now", {
    actions: iconBtn("ports", "Open ports", "network") + iconBtn("reload", "Refresh", "refresh"),
  }) + `<main class="body pad">
      ${tabs()}
      ${rows || `<p class="empty">Nothing is running.<br>Open a project and send a message.</p>`}
    </main>`;
}

function viewStarred() {
  const rows = state.favorites.map((f) => `
    <div class="row-wrap">
      <button class="row" data-act="open-fav" data-id="${esc(f.sessionId)}" data-cwd="${esc(f.cwd)}">
        <div class="row-title"><span class="txt" dir="${dirOf(f.title)}">${esc(f.title)}</span>${state.activeSessions.has(f.sessionId) ? '<span class="pill">running</span>' : ""}</div>
        <div class="row-path">${esc(f.cwd)}</div>
        <div class="row-meta"><span>starred ${ago(f.starredAt)}</span></div>
      </button>
      ${starBtn(f.sessionId, f.title, true)}
    </div>`).join("");

  return header("Claude Remote", "Sessions you starred", {
    actions: iconBtn("ports", "Open ports", "network") + iconBtn("reload", "Refresh", "refresh"),
  }) + `<main class="body pad">
      ${tabs()}
      ${rows || `<p class="empty">Nothing starred yet.<br>Tap the star beside a session to keep it here.</p>`}
    </main>`;
}

function viewProjects() {
  const rows = state.projects.map((w) => `
    <button class="row" data-act="open-project" data-cwd="${esc(w.cwd)}">
      <div class="row-title"><span class="txt">${esc(w.name)}</span>${w.exists ? "" : '<span class="pill">missing</span>'}</div>
      <div class="row-path">${esc(w.cwd)}</div>
      <div class="row-meta"><span>${w.sessionCount} session${w.sessionCount === 1 ? "" : "s"}</span><span class="sep">&middot;</span><span>${ago(w.mtime)}</span></div>
    </button>`).join("");

  return header("Claude Remote", "Pick a folder to work in", {
    actions: iconBtn("ports", "Open ports", "network") + iconBtn("pick-dir", "Browse folders", "folder") + iconBtn("reload", "Refresh", "refresh"),
  }) + `<main class="body pad">
      ${tabs()}
      ${state.error ? `<div class="err-box">${esc(state.error)}</div>` : ""}
      ${rows || `<p class="empty">${state.busy ? "Loading..." : "No sessions yet. Use the folder icon to pick one."}</p>`}
    </main>`;
}

function starBtn(id, title, on) {
  return `<button class="star${on ? " on" : ""}" data-act="star" data-id="${esc(id)}"
    data-title="${esc(title)}" data-on="${on ? 1 : 0}"
    aria-pressed="${on}" aria-label="${on ? "Remove from starred" : "Add to starred"}">${svg("star")}</button>`;
}

function viewSessions() {
  const rows = state.sessions.map((s) => `
    <div class="row-wrap">
      <button class="row" data-act="open-session" data-id="${esc(s.id)}">
        <div class="row-title"><span class="txt" dir="${dirOf(s.title)}">${esc(s.title)}</span>${state.activeSessions.has(s.id) ? '<span class="pill">running</span>' : ""}</div>
        <div class="row-meta"><span>${s.userCount} message${s.userCount === 1 ? "" : "s"}</span><span class="sep">&middot;</span><span>${ago(s.mtime)}</span></div>
      </button>
      ${starBtn(s.id, s.title, !!s.starred)}
    </div>`).join("");

  return header(basename(state.cwd), state.cwd, {
    back: true,
    actions: iconBtn("files", "Browse files", "folder") + iconBtn("reload", "Refresh", "refresh"),
  }) + `<main class="body pad">
      <button class="row row-new" data-act="new-session">${svg("plus")} New session</button>
      ${state.error ? `<div class="err-box">${esc(state.error)}</div>` : ""}
      ${rows || `<p class="empty">${state.busy ? "Loading..." : "No sessions in this folder yet."}</p>`}
    </main>`;
}

function usageChip() {
  const u = state.usage;
  if (!u) return `<button class="mode-chip usage-chip" data-act="usage" aria-label="Plan usage">
      <span class="usage-bar"><i style="width:0%"></i></span><span class="usage-txt">…</span></button>`;
  if (!u.available || !u.fiveHour) {
    return `<button class="mode-chip usage-chip" data-act="usage" aria-label="Plan usage">
      <span class="usage-txt">no limit</span></button>`;
  }
  const pct = u.fiveHour.utilization;
  const left = until(u.fiveHour.resetsAt);
  return `<button class="mode-chip usage-chip ${usageLevel(pct)}" data-act="usage"
      aria-label="Five hour limit ${pct} percent used${left ? `, resets in ${left}` : ""}">
    <span class="usage-bar"><i style="width:${pct}%"></i></span>
    <span class="usage-txt">${pct}%${left ? ` · ${esc(left)}` : ""}</span>
  </button>`;
}

function usageRow(label, w) {
  if (!w) return `<div class="u-row"><b>${label}</b><em>not available</em></div>`;
  const left = until(w.resetsAt);
  const when = w.resetsAt ? new Date(w.resetsAt).toLocaleString() : "unknown";
  return `<div class="u-row ${usageLevel(w.utilization)}">
    <div class="u-head"><b>${label}</b><span class="u-pct">${w.utilization}%</span></div>
    <div class="u-track"><i style="width:${w.utilization}%"></i></div>
    <em>${left ? `resets in ${esc(left)}` : "reset time unknown"} · ${esc(when)}</em>
  </div>`;
}

async function openUsage() {
  const el = document.createElement("div");
  el.className = "scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Plan usage">
    <div class="sheet-hdr"><h2>Plan usage</h2>
      <button class="btn-icon" data-act="usage-refresh" aria-label="Refresh usage">${svg("refresh")}</button>
      <button class="btn-icon" data-act="close-sheet" aria-label="Close">${svg("close")}</button></div>
    <div class="sheet-body" id="usage-body"><p class="empty">Loading...</p></div></div>`;
  el.addEventListener("click", (e) => { if (e.target === el) el.remove(); });
  el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAction));
  document.body.appendChild(el);
  paintUsageSheet();
  await refreshUsage();
  paintUsageSheet();
}

function paintUsageSheet() {
  const body = $("#usage-body");
  if (!body) return;
  const u = state.usage;
  if (!u) { body.innerHTML = `<p class="empty">Loading...</p>`; return; }
  if (!u.available) {
    body.innerHTML = `<p class="empty">Plan limits do not apply to this account.${u.error ? `<br><small>${esc(u.error)}</small>` : ""}</p>`;
    return;
  }
  body.innerHTML = `
    ${u.plan ? `<p class="hint" style="margin-top:0">Plan: <b>${esc(u.plan)}</b></p>` : ""}
    ${usageRow("5 hour window", u.fiveHour)}
    ${usageRow("7 day window", u.sevenDay)}
    <p class="hint">Percentages come from the same source as <code>/usage</code> in Claude Code. Cached for 60 seconds.</p>`;
}

function askPreview(a) {
  const i = a.input || {};
  const txt = i.command || i.content || i.new_string || i.file_path || i.path || "";
  if (!txt) return "";
  return codeBlock([{ t: "ctx", x: String(txt).slice(0, 800) }], { wrap: true });
}

function liveBlock() {
  const l = state.live;
  if (!l) return "";
  const parts = [];
  if (l.thinking) parts.push({ kind: "thinking", text: l.thinking });
  for (const t of l.tools) parts.push({ kind: "tool", name: t.name, input: t.input, result: t.result });
  if (l.text) parts.push({ kind: "text", text: l.text });
  if (!parts.length && !l.error) return '<article class="msg assistant" id="live"></article>';
  return `<article class="msg assistant" id="live"><div class="msg-role">Claude</div>
    ${partsView(parts, "live", true)}
    ${l.error ? `<div class="err-box">${esc(l.error)}</div>` : ""}
  </article>`;
}

function paintLive() {
  const el = document.getElementById("live");
  if (!el || state.view !== "chat") return render();
  const atBottom = docBottomGap() < 160;
  const fresh = liveBlock();
  const holder = document.createElement("div");
  holder.innerHTML = fresh;
  const next = holder.firstElementChild;
  if (!next) return render();
  el.replaceWith(next);
  next.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAction));
  if (atBottom) window.scrollTo(0, document.documentElement.scrollHeight);
}

function qKey(id, i) { return `${id}::${i}`; }

function hasAnswer(card) {
  const id = card.querySelector('[data-act="qsend"]')?.dataset.id;
  const ask = (state.live?.asks || []).find((x) => x.id === id);
  if (!ask) return false;
  return ask.questions.some((_, qi) => {
    const d = state.qDraft[qKey(id, qi)];
    return d && (d.selected.length || (d.other || "").trim());
  });
}

function questionCard(a) {
  const body = a.questions.map((q, qi) => {
    const key = qKey(a.id, qi);
    const draft = state.qDraft[key] || { selected: [], other: "" };
    const opts = q.options.map((op) => {
      const on = draft.selected.includes(op.label);
      return `<button class="qopt${on ? " on" : ""}" data-act="qpick" data-key="${esc(key)}"
        data-label="${esc(op.label)}" data-multi="${q.multiSelect ? 1 : 0}" aria-pressed="${on}">
        <span class="qbox">${on ? svg("check") : ""}</span>
        <span class="qtext"><b dir="${dirOf(op.label)}">${esc(op.label)}</b>${
          op.description ? `<em dir="${dirOf(op.description)}">${esc(op.description)}</em>` : ""}</span>
      </button>`;
    }).join("");

    return `<div class="qblock">
      ${q.header ? `<div class="qhead">${esc(q.header)}</div>` : ""}
      <p class="qtitle" dir="${dirOf(q.question)}">${esc(q.question)}</p>
      ${q.multiSelect ? '<p class="qhint">Pick one or more</p>' : ""}
      <div class="qopts">${opts}</div>
      <input class="qother" type="text" placeholder="Something else..."
        data-act="qother" data-key="${esc(key)}" value="${esc(draft.other)}">
    </div>`;
  }).join("");

  const ready = a.questions.some((_, qi) => {
    const d = state.qDraft[qKey(a.id, qi)];
    return d && (d.selected.length || (d.other || "").trim());
  });

  return `<section class="qcard" role="group" aria-label="Claude is asking">
    <div class="qcard-h">${svg("help")} Claude is asking</div>
    ${body}
    <div class="qactions">
      <button class="btn-primary" data-act="qsend" data-id="${esc(a.id)}" ${ready ? "" : "disabled"}>Send answer</button>
      <button class="btn-danger" data-act="qskip" data-id="${esc(a.id)}">Skip</button>
    </div>
  </section>`;
}

function viewChat() {
  const merged = [];
  for (const m of state.messages) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role && m.role === "assistant") prev.parts = prev.parts.concat(m.parts);
    else merged.push({ role: m.role, parts: [...m.parts] });
  }

  const msgs = merged.map((m, mi) => `
    <article class="msg ${m.role}">
      <div class="msg-role">${m.role === "user" ? "You" : "Claude"}</div>
      ${partsView(m.parts, mi)}
    </article>`).join("");

  const liveHtml = liveBlock();

  const pend = state.live?.asks || [];
  const questions = pend.filter((a) => a.kind === "question").map(questionCard).join("");
  const asks = pend.filter((a) => a.kind !== "question").map((a) => `
    <section class="ask" role="alertdialog" aria-label="Permission request">
      <div class="ask-h">${svg("lock")} Permission needed</div>
      <div class="ask-what"><span class="tool-name">${esc(a.displayName || a.toolName)}</span>
        <span class="tool-sub">${esc(a.description || "")}</span></div>
      ${a.title ? `<p class="ask-note" dir="${dirOf(a.title)}">${esc(a.title)}</p>` : ""}
      ${a.decisionReason ? `<p class="ask-note">${esc(a.decisionReason)}</p>` : ""}
      ${askPreview(a)}
      <div class="ask-actions">
        <button class="btn-primary" data-act="perm" data-id="${esc(a.id)}" data-d="allow">Allow</button>
        ${a.canAlwaysAllow ? `<button data-act="perm" data-id="${esc(a.id)}" data-d="always">Always</button>` : ""}
        <button class="btn-danger" data-act="perm" data-id="${esc(a.id)}" data-d="deny">Deny</button>
      </div>
    </section>`).join("");

  const chips = state.attachments.map((f, i) => `
    <span class="attach">
      ${f.preview ? `<img class="thumb" src="${esc(f.preview)}" alt="">` : svg("file", "attach-ic")}
      <span class="nm">${esc(f.name)}</span>
      <button data-act="rm-attach" data-i="${i}" aria-label="Remove ${esc(f.name)}">${svg("close")}</button>
    </span>`).join("");

  const running = !!state.runId;

  const earlier = state.historyOffset > 0
    ? `<button class="row row-new" data-act="load-earlier" ${state.loadingMore ? "disabled" : ""}>
         ${state.loadingMore ? "Loading..." : `Load earlier (${state.historyOffset} more)`}</button>`
    : "";

  return header(state.sessionId ? "Session" : "New session", state.cwd, {
    back: true,
    actions: iconBtn("files", "Browse files", "folder"),
  }) + `<main class="body pad" id="chat">
      ${earlier}
      ${msgs || (state.busy ? '<p class="empty">Loading...</p>' : '<p class="empty">Send the first message.</p>')}
      ${liveHtml}
      ${questions}
      ${asks}
      ${running ? `<div class="status" role="status"><span class="dot"></span><span id="stx">Working...</span>
        <button class="btn-sm btn-danger" data-act="stop" style="margin-left:auto">Stop</button></div>` : ""}
    </main>
    <div class="composer">
      <div class="mode-bar">
        <button class="mode-chip" data-act="mode-open" aria-haspopup="dialog">
          <span class="mode-dot" data-mode="${esc(state.opts.permissionMode)}"></span>
          <span>${esc(modeOf(state.opts.permissionMode).label)}</span>
          ${svg("chevD")}
        </button>
        <button class="mode-chip" data-act="effort-open" aria-haspopup="dialog"
                aria-label="Reasoning effort: ${esc(effortOf(state.opts.effort).label)}">
          ${effortBars(state.opts.effort)}
          <span>${esc(effortOf(state.opts.effort).short)}</span>
          ${svg("chevD")}
        </button>
        ${usageChip()}
      </div>
      ${chips ? `<div class="attach-list">${chips}</div>` : ""}
      <div class="composer-row">
        <button data-act="attach" aria-label="Attach file">${svg("paperclip")}</button>
        <textarea id="input" rows="1" enterkeyhint="send" placeholder="Message Claude..." aria-label="Message">${esc(state.draft)}</textarea>
        ${running
          ? `<button class="btn-danger" data-act="stop" aria-label="Stop">${svg("stop")}</button>`
          : `<button class="btn-primary" data-act="send" aria-label="Send">${svg("send")}</button>`}
      </div>
    </div>
    <input type="file" id="picker" multiple hidden>`;
}

function viewFiles() {
  const f = state.fs;
  if (!f) return header("Files", "", { back: true }) + '<main class="body"><p class="empty">Loading...</p></main>';

  const rows = f.items.map((it) => `
    <button class="file" data-act="${it.dir ? "cd" : "copy"}" data-path="${esc(it.path)}">
      ${svg(it.dir ? "folder" : "file")}
      <span class="nm">${esc(it.name)}</span>
      <span class="sz">${it.dir ? "" : size(it.size)}</span>
      <span class="btn-icon" data-act="copy" data-path="${esc(it.path)}" role="button" aria-label="Copy path of ${esc(it.name)}">${svg("copy")}</span>
    </button>`).join("");

  return header("Files", "Tap a file to copy its path", {
    back: true,
    actions: iconBtn("copy", "Copy current folder path", "copy", `data-path="${esc(f.path)}"`),
  }) + `<div class="crumb">${esc(f.path)}</div>
    <main class="body">
      ${f.parent ? `<button class="file" data-act="cd" data-path="${esc(f.parent)}">${svg("up")}<span class="nm">..</span></button>` : ""}
      ${rows || '<p class="empty">Empty folder</p>'}
    </main>
    ${state.fsPick ? `<div class="composer"><button class="btn-primary" style="width:100%" data-act="use-dir" data-path="${esc(f.path)}">Open this folder</button></div>` : ""}`;
}

function viewPorts() {
  const host = location.hostname;
  const rows = (state.ports?.ports || []).map((x) => `
    <div class="port">
      <span class="num">${x.port}</span>
      <span class="who">${esc(x.command)} &middot; ${esc(x.hosts.join(" "))}</span>
      ${x.wildcard
        ? `<a href="http://${host}:${x.port}" target="_blank" rel="noopener">Open</a>`
        : '<span class="local">localhost only</span>'}
    </div>`).join("");

  return header("Ports", host, { back: true, actions: iconBtn("reload", "Refresh", "refresh") }) +
    `<main class="body">
      ${rows || '<p class="empty">Loading...</p>'}
      <p class="muted pad">Ports marked <em>localhost only</em> are not reachable from your phone. The server must bind to <code>0.0.0.0</code>.</p>
    </main>`;
}

function viewLogin() {
  return `<header class="hdr"><div class="hdr-title"><h1>Claude Remote</h1></div></header>
    <main class="body pad"><div class="login">
      <h2>Sign in</h2>
      <p class="lead">Enter the access token from this Mac.</p>
      <div class="field"><label for="tok">Access token</label>
        <input id="tok" type="password" autocomplete="current-password" placeholder="Paste token"></div>
      <button class="btn-primary" data-act="login" style="width:100%">Continue</button>
      <p class="muted" style="margin-top:16px">Find it in <code>~/.claude-remote/token</code></p>
    </div></main>`;
}

/* ------------------------------------------------------------------ render */
const VIEWS = { projects: viewProjects, starred: viewStarred, active: viewActive, sessions: viewSessions, chat: viewChat, files: viewFiles, ports: viewPorts };

function docBottomGap() {
  return document.documentElement.scrollHeight - window.scrollY - window.innerHeight;
}

function render() {
  const wasChat = state.view === "chat";
  const atBottom = wasChat ? docBottomGap() < 160 : true;
  const prevY = window.scrollY;

  app.innerHTML = state.token ? (VIEWS[state.view] || viewProjects)() : viewLogin();
  bind();

  if (state.view === "chat") {
    if (atBottom) requestAnimationFrame(() => window.scrollTo(0, document.documentElement.scrollHeight));
    else window.scrollTo(0, prevY);
  } else {
    window.scrollTo(0, 0);
  }
  tick();
  tickRuns();
  pollRuns();
}

function bind() {
  $$("[data-act]").forEach((el) => el.addEventListener("click", onAction));

  const ta = $("#input");
  if (ta) {
    const grow = () => {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, innerHeight * 0.38) + "px";
    };
    ta.addEventListener("input", () => { state.draft = ta.value; grow(); });
    ta.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      if (e.isComposing || e.keyCode === 229) return;   // mid IME composition
      if (e.shiftKey || e.altKey) return;               // deliberate newline
      e.preventDefault();
      send();
    });
    grow();
  }

  $("#picker")?.addEventListener("change", (e) => { upload(e.target.files); e.target.value = ""; });

  const comp = $(".composer");
  if (comp) {
    comp.addEventListener("paste", onPaste);
    comp.addEventListener("dragover", (e) => { e.preventDefault(); document.body.classList.add("dropping"); });
    comp.addEventListener("dragleave", () => document.body.classList.remove("dropping"));
    comp.addEventListener("drop", onDrop);
  }
  $("#tok")?.addEventListener("keydown", (e) => { if (e.key === "Enter") login(); });
}

/* ------------------------------------------------------------------ actions */
async function onAction(e) {
  const el = e.currentTarget;
  const act = el.dataset.act;
  e.stopPropagation();
  e.preventDefault();

  switch (act) {
    case "login": return login();
    case "copy": return copyText(el.dataset.path);

    case "tool": {
      const k = el.dataset.key;
      if (state.openTools.has(k)) state.openTools.delete(k);
      else state.openTools.add(k);
      return render();
    }

    case "tab": {
      state.tab = el.dataset.v;
      state.view = state.tab;
      render();
      if (state.tab === "active") { await refreshRuns(); render(); }
      else if (state.tab === "starred") { await loadFavorites(); render(); }
      return;
    }

    case "open-run": {
      state.cwd = el.dataset.cwd;
      state.sessionId = el.dataset.sid || null;
      return loadHistory(el.dataset.run);
    }

    case "stop-run": {
      await api(`/run/${el.dataset.run}/stop`, { method: "POST" }).catch((e) => toast(e.message));
      await refreshRuns();
      return render();
    }

    case "usage": return openUsage();

    case "usage-refresh": {
      state.usage = null;
      paintUsageSheet();
      await refreshUsage(true);
      paintUsageSheet();
      render();
      return;
    }

    case "switcher": return openSwitcher();

    case "switch-to": {
      $(".scrim")?.remove();
      const sid = el.dataset.sid || null;
      if (sid && sid === state.sessionId && state.view === "chat") return;
      state.cwd = el.dataset.cwd;
      state.sessionId = sid;
      return loadHistory(el.dataset.run);
    }

    case "see-all": {
      $(".scrim")?.remove();
      state.tab = "active";
      state.view = "active";
      render();
      await refreshRuns();
      return render();
    }

    case "settings": return openSettings();

    case "mode-open": return openModePicker();
    case "effort-open": return openEffortPicker();

    case "effort-set": {
      state.opts.effort = el.dataset.v;
      LS.setItem("cr_effort", el.dataset.v);
      $(".scrim")?.remove();
      toast("Effort: " + effortOf(el.dataset.v).label);
      return render();
    }

    case "mode-set": {
      state.opts.permissionMode = el.dataset.v;
      LS.setItem("cr_perm", el.dataset.v);
      $(".scrim")?.remove();
      toast("Mode: " + modeOf(el.dataset.v).label);
      return render();
    }
    case "close-sheet": return $(".scrim")?.remove();

    case "set-theme": {
      document.documentElement.dataset.theme = el.dataset.v;
      LS.setItem("cr_theme", el.dataset.v);
      el.parentElement.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === el)));
      return;
    }

    case "font": return setFont(Number(el.dataset.d));

    case "inset": {
      const cur = parseInt(LS.getItem("cr_inset") || "0", 10) || 0;
      const next = Math.max(0, Math.min(240, cur + Number(el.dataset.d)));
      LS.setItem("cr_inset", String(next));
      applyInset();
      const v = $("#insetval");
      if (v) v.textContent = next + " px";
      return;
    }

    case "logout": {
      LS.removeItem("cr_token");
      clearActive();
      return location.reload();
    }

    case "back": return goBack();
    case "reload": return reload();
    case "open-project": { state.cwd = el.dataset.cwd; return loadSessions(); }
    case "open-session": { state.sessionId = el.dataset.id; return loadHistory(); }

    case "new-session": {
      detachStream();
      ensureUsage();
      state.sessionId = null;
      state.messages = [];
      state.busy = false;
      state.openTools.clear();
      state.view = "chat";
      return render();
    }

    case "files": { state.fsPick = false; return openFiles(state.cwd); }
    case "pick-dir": { state.fsPick = true; return openFiles(null); }
    case "cd": return openFiles(el.dataset.path);
    case "use-dir": { state.cwd = el.dataset.path; state.fsPick = false; return loadSessions(); }

    case "ports": {
      state.view = "ports";
      render();
      state.ports = await api("/ports").catch(() => ({ ports: [] }));
      return render();
    }

    case "attach": return $("#picker").click();
    case "rm-attach": {
      const [gone] = state.attachments.splice(Number(el.dataset.i), 1);
      if (gone?.preview) { try { URL.revokeObjectURL(gone.preview); } catch {} }
      return render();
    }
    case "star": {
      const id = el.dataset.id;
      const on = el.dataset.on === "1";
      const cwd = el.dataset.cwd || state.cwd;
      el.disabled = true;
      try {
        await api("/favorites", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: id, cwd, title: el.dataset.title, starred: !on }),
        });
        const sess = state.sessions.find((x) => x.id === id);
        if (sess) sess.starred = !on;
        await loadFavorites();
        toast(on ? "Removed from starred" : "Added to starred");
      } catch (err) { toast(err.message); el.disabled = false; }
      return render();
    }

    case "open-fav": {
      state.cwd = el.dataset.cwd;
      state.sessionId = el.dataset.id;
      return loadHistory();
    }

    case "qpick": {
      const key = el.dataset.key;
      const label = el.dataset.label;
      const multi = el.dataset.multi === "1";
      const d = state.qDraft[key] || { selected: [], other: "" };
      if (multi) {
        d.selected = d.selected.includes(label)
          ? d.selected.filter((x) => x !== label)
          : [...d.selected, label];
      } else {
        d.selected = d.selected.includes(label) ? [] : [label];
      }
      state.qDraft[key] = d;
      return render();
    }

    case "qsend": {
      const id = el.dataset.id;
      const ask = (state.live?.asks || []).find((x) => x.id === id);
      if (!ask) return;
      const answers = ask.questions.map((_, qi) => {
        const d = state.qDraft[qKey(id, qi)] || { selected: [], other: "" };
        return { selected: d.selected, other: d.other };
      });
      el.disabled = true;
      try {
        await api(`/run/${state.runId}/answer`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, answers }),
        });
        ask.questions.forEach((_, qi) => delete state.qDraft[qKey(id, qi)]);
      } catch (err) { toast(err.message); el.disabled = false; }
      if (state.live) state.live.asks = state.live.asks.filter((x) => x.id !== id);
      return render();
    }

    case "qskip": {
      const id = el.dataset.id;
      el.disabled = true;
      try {
        await api(`/run/${state.runId}/answer`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, cancel: true }),
        });
      } catch (err) { toast(err.message); el.disabled = false; }
      if (state.live) state.live.asks = state.live.asks.filter((x) => x.id !== id);
      return render();
    }

    case "load-earlier": return loadEarlier();
    case "send": return send();
    case "stop": return stop();

    case "perm": {
      const id = el.dataset.id;
      const d = el.dataset.d;
      el.parentElement.querySelectorAll("button").forEach((b) => (b.disabled = true));
      try {
        await api(`/run/${state.runId}/permission`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, decision: d }),
        });
      } catch (err) { toast(err.message); }
      if (state.live) state.live.asks = state.live.asks.filter((x) => x.id !== id);
      return render();
    }
  }
}

function login() {
  const v = $("#tok")?.value.trim();
  if (!v) return;
  state.token = v;
  LS.setItem("cr_token", v);
  boot();
}

function goBack() {
  if (state.view === "chat") detachStream();
  if (state.view === "files") {
    state.view = state.cwd ? "sessions" : "projects";
    return render();
  }
  if (state.view === "ports") { state.view = state.tab; return render(); }
  if (state.view === "chat") { state.view = "sessions"; return loadSessions(); }
  state.view = "projects";
  state.tab = "projects";
  state.cwd = null;
  render();
}

async function reload() {
  if (state.view === "active") { await refreshRuns(); return render(); }
  if (state.view === "projects") return loadProjects();
  if (state.view === "sessions") return loadSessions();
  if (state.view === "files") return openFiles(state.fs?.path);
  if (state.view === "ports") {
    return onAction({ currentTarget: { dataset: { act: "ports" } }, stopPropagation() {}, preventDefault() {} });
  }
}

/* ------------------------------------------------------------------ switcher */
async function openSwitcher() {
  const el = document.createElement("div");
  el.className = "scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Active sessions">
    <div class="sheet-hdr"><h2>Active sessions</h2>
      <button class="btn-icon" data-act="close-sheet" aria-label="Close">${svg("close")}</button></div>
    <div class="sheet-body" id="switcher-body"><p class="empty">Loading...</p></div></div>`;
  el.addEventListener("click", (e) => { if (e.target === el) el.remove(); });
  el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAction));
  document.body.appendChild(el);

  await refreshRuns();
  const body = el.querySelector("#switcher-body");
  if (!body) return;

  if (!state.runs.length) {
    body.innerHTML = `<p class="empty">Nothing is running.</p>`;
  } else {
    body.innerHTML = state.runs.map((r) => {
      const here = r.sessionId && r.sessionId === state.sessionId;
      const waiting = r.pending?.length || 0;
      return `<button class="sw-row${waiting ? " waiting" : ""}${here ? " here" : ""}"
          data-act="switch-to" data-run="${esc(r.runId)}" data-cwd="${esc(r.cwd)}" data-sid="${esc(r.sessionId || "")}">
        <span class="sw-dot"></span>
        <span class="sw-text">
          <b>${esc(basename(r.cwd))}${here ? " · open" : ""}</b>
          <em dir="${dirOf(r.prompt)}">${esc(r.prompt)}</em>
        </span>
        <span class="sw-right">
          ${waiting ? `<span class="pill urgent">needs you</span>` : ""}
          <span class="sw-clock" data-elapsed="${r.startedAt}">${clock((Date.now() - r.startedAt) / 1000)}</span>
        </span>
      </button>`;
    }).join("") + `<button class="btn-sm" style="width:100%;margin-top:6px" data-act="see-all">See all in Active</button>`;
    body.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAction));
    tickRuns();
  }
}

/* ------------------------------------------------------------------ mode picker */
function openModePicker() {
  const cur = state.opts.permissionMode;
  const el = document.createElement("div");
  el.className = "scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Permission mode">
    <div class="sheet-hdr"><h2>Permission mode</h2>
      <button class="btn-icon" data-act="close-sheet" aria-label="Close">${svg("close")}</button></div>
    <div class="sheet-body">
      ${MODES.map((m) => `
        <button class="mode-row${m.id === cur ? " on" : ""}" data-act="mode-set" data-v="${m.id}" aria-pressed="${m.id === cur}">
          <span class="mode-dot" data-mode="${m.id}"></span>
          <span class="mode-text"><b>${m.label}</b><em>${m.hint}</em></span>
          ${m.id === cur ? svg("check", "mode-check") : ""}
        </button>`).join("")}
      <p class="hint">Applies to your next message. Sessions keep whatever you pick here.</p>
    </div></div>`;
  el.addEventListener("click", (e) => { if (e.target === el) el.remove(); });
  el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAction));
  document.body.appendChild(el);
}

function openEffortPicker() {
  const cur = state.opts.effort || "";
  const el = document.createElement("div");
  el.className = "scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Reasoning effort">
    <div class="sheet-hdr"><h2>Reasoning effort</h2>
      <button class="btn-icon" data-act="close-sheet" aria-label="Close">${svg("close")}</button></div>
    <div class="sheet-body">
      ${EFFORTS.map((e) => `
        <button class="mode-row${e.id === cur ? " on" : ""}" data-act="effort-set" data-v="${e.id}" aria-pressed="${e.id === cur}">
          ${effortBars(e.id)}
          <span class="mode-text"><b>${e.label}</b><em>${e.hint}</em></span>
          ${e.id === cur ? svg("check", "mode-check") : ""}
        </button>`).join("")}
      <p class="hint">Applies to your next message. Higher effort is slower and uses more of your plan.</p>
    </div></div>`;
  el.addEventListener("click", (ev) => { if (ev.target === el) el.remove(); });
  el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAction));
  document.body.appendChild(el);
}

/* ------------------------------------------------------------------ settings */
function openSettings() {
  const o = state.opts;
  const fs = parseInt(LS.getItem("cr_fs") || "15", 10);
  const theme = document.documentElement.dataset.theme;
  const sel = (cur) => (v) => (cur === v ? "selected" : "");
  const m = sel(o.model);
  const pm = sel(o.permissionMode);
  const ef = sel(o.effort);

  const el = document.createElement("div");
  el.className = "scrim";
  el.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="Settings">
    <div class="sheet-hdr"><h2>Settings</h2>
      <button class="btn-icon" data-act="close-sheet" aria-label="Close settings">${svg("close")}</button></div>
    <div class="sheet-body">
      <div class="field"><label>Appearance</label>
        <div class="seg" role="group" aria-label="Theme">
          <button data-act="set-theme" data-v="light" aria-pressed="${theme === "light"}">Light</button>
          <button data-act="set-theme" data-v="dark" aria-pressed="${theme === "dark"}">Dark</button>
        </div></div>

      <div class="field"><label>Text size</label>
        <div class="stepper">
          <button data-act="font" data-d="-1" aria-label="Smaller text">A−</button>
          <span class="val" id="fsval" aria-live="polite">${fs} px</span>
          <button data-act="font" data-d="1" aria-label="Larger text">A+</button>
        </div></div>

      <div class="field"><label for="s-model">Model</label>
        <select id="s-model">
          <option value="" ${m("")}>Default</option>
          <option value="opus" ${m("opus")}>Opus</option>
          <option value="sonnet" ${m("sonnet")}>Sonnet</option>
          <option value="haiku" ${m("haiku")}>Haiku</option>
        </select></div>

      <div class="field"><label for="s-perm">Permission mode</label>
        <select id="s-perm">
          ${MODES.map((m) => `<option value="${m.id}" ${pm(m.id)}>${m.label}</option>`).join("")}
        </select>
        <p class="hint">${esc(modeOf(o.permissionMode).hint)}</p></div>


      <div class="field"><label>Bottom spacing</label>
        <div class="stepper">
          <button data-act="inset" data-d="-10" aria-label="Less bottom spacing">−</button>
          <span class="val" id="insetval" aria-live="polite">${parseInt(LS.getItem("cr_inset") || "0", 10)} px</span>
          <button data-act="inset" data-d="10" aria-label="More bottom spacing">+</button>
        </div>
        <p class="hint">Raise this if your browser's bottom bar covers the message box.</p></div>

      <div class="field"><label>Viewport</label>
        <p class="hint" id="vpinfo" style="font-family:ui-monospace,Menlo,monospace"></p></div>

      <button class="btn-danger" data-act="logout" style="width:100%">Sign out</button>
    </div></div>`;

  el.addEventListener("click", (e) => { if (e.target === el) el.remove(); });
  el.querySelector("#s-model").onchange = (e) => { o.model = e.target.value; LS.setItem("cr_model", o.model); };
  el.querySelector("#s-perm").onchange = (e) => { o.permissionMode = e.target.value; LS.setItem("cr_perm", o.permissionMode); };
  el.querySelectorAll("[data-act]").forEach((b) => b.addEventListener("click", onAction));
  document.body.appendChild(el);

  const info = el.querySelector("#vpinfo");
  const vv = window.visualViewport;
  info.textContent =
    `inner ${innerHeight} / visual ${vv ? Math.round(vv.height) : "n/a"} / ` +
    `client ${document.documentElement.clientHeight} / dpr ${devicePixelRatio}`;

  el.querySelector("[data-act=close-sheet]").focus();
}

function setFont(delta) {
  const next = Math.min(22, Math.max(12, parseInt(LS.getItem("cr_fs") || "15", 10) + delta));
  LS.setItem("cr_fs", String(next));
  document.documentElement.style.setProperty("--fs", next + "px");
  const v = $("#fsval");
  if (v) v.textContent = next + " px";
}

/* ------------------------------------------------------------------ data */
async function loadFavorites() {
  try { state.favorites = (await api("/favorites")).favorites; }
  catch { state.favorites = []; }
}

async function loadProjects() {
  state.view = "projects";
  state.busy = true;
  state.error = null;
  render();
  try {
    state.projects = (await api("/workspaces")).workspaces;
  } catch (err) {
    state.error = err.message;
    if (/token/i.test(err.message)) { LS.removeItem("cr_token"); state.token = ""; }
  }
  state.busy = false;
  render();
}

async function refreshUsage(force = false) {
  try { state.usage = await api("/usage" + (force ? "?force=1" : "")); }
  catch { state.usage = state.usage || { available: false, error: "unreachable" }; }
  return state.usage;
}

async function refreshRuns() {
  try {
    const { runs } = await api("/runs");
    state.runs = runs
      .filter((r) => r.status === "running")
      .sort((a, b) => {
        const aw = (a.pending?.length || 0) > 0;
        const bw = (b.pending?.length || 0) > 0;
        if (aw !== bw) return aw ? -1 : 1;
        return b.startedAt - a.startedAt;
      });
    state.activeSessions = new Set(state.runs.filter((r) => r.sessionId).map((r) => r.sessionId));
    return runs;
  } catch { return []; }
}

async function loadSessions() {
  state.view = "sessions";
  state.busy = true;
  state.error = null;
  state.sessions = [];
  render();
  try {
    state.sessions = (await api("/sessions?cwd=" + encodeURIComponent(state.cwd))).sessions;
  } catch (err) { state.error = err.message; }
  await refreshRuns();
  state.busy = false;
  render();
}

const PAGE = 40;

async function loadEarlier() {
  if (state.loadingMore || state.historyOffset <= 0) return;
  state.loadingMore = true;
  render();
  try {
    const d = await api(`/history?cwd=${encodeURIComponent(state.cwd)}&sessionId=${state.sessionId}&limit=${PAGE}&before=${state.historyOffset}`);
    state.messages = d.messages.concat(state.messages);
    state.historyOffset = d.offset;
    state.historyTotal = d.total;
  } catch (err) { toast(err.message); }
  state.loadingMore = false;
  render();
}

async function loadHistory(runIdHint) {
  detachStream();
  state.view = "chat";
  state.busy = true;
  state.messages = [];
  state.historyTotal = 0;
  state.historyOffset = 0;
  state.openTools.clear();
  render();

  if (state.sessionId) {
    try {
      const d = await api(`/history?cwd=${encodeURIComponent(state.cwd)}&sessionId=${state.sessionId}&limit=${PAGE}`);
      state.messages = d.messages;
      state.historyTotal = d.total;
      state.historyOffset = d.offset;
    } catch (err) { toast(err.message); }
  }
  state.busy = false;

  ensureUsage();

  const runs = await refreshRuns();
  const live = runs.find((r) => r.status === "running" &&
    (runIdHint ? r.runId === runIdHint : r.sessionId && r.sessionId === state.sessionId));
  if (live && !state.runId) return attach(live.runId, live.startedAt, live.pending);
  render();
}

function detachStream() {
  if (state.stream) {
    try { state.stream.es.close(); } catch {}
    state.stream = null;
  }
  clearInterval(ticker);
  state.runId = null;
  state.live = null;
  state.runStart = 0;
}

function ensureUsage() {
  if (state.usage) return;
  state.usage = null;
  refreshUsage().then(() => render());
}

function attach(runId, startedAt, pending) {
  detachStream();
  state.runId = runId;
  state.runStart = startedAt || Date.now();
  state.lastEventAt = Date.now();
  state.live = { text: "", thinking: "", tools: [], error: null, asks: pending || [] };
  saveActive({ runId, sessionId: state.sessionId, cwd: state.cwd });
  render();
  stream(runId, 0);
}

async function openFiles(p) {
  state.view = "files";
  render();
  try { state.fs = await api("/fs?path=" + encodeURIComponent(p || "~")); }
  catch (err) { toast(err.message); }
  render();
}

function filesFromClipboard(dt) {
  if (!dt) return [];
  if (dt.files && dt.files.length) return [...dt.files];
  const out = [];
  for (const item of dt.items || []) {
    if (item.kind !== "file") continue;
    const f = item.getAsFile();
    if (f) out.push(f);
  }
  return out;
}

function onPaste(e) {
  const files = filesFromClipboard(e.clipboardData);
  if (!files.length) return;                  // plain text pastes normally
  e.preventDefault();
  e.stopPropagation();
  upload(files);
}

function onDrop(e) {
  const files = filesFromClipboard(e.dataTransfer);
  document.body.classList.remove("dropping");
  if (!files.length) return;
  e.preventDefault();
  e.stopPropagation();
  upload(files);
}

async function upload(files) {
  const list = [...(files || [])];
  if (!list.length) return;

  const fd = new FormData();
  list.forEach((f, i) => fd.append("files", f, f.name || `pasted-${i}.png`));
  toast(list.length === 1 ? "Uploading..." : `Uploading ${list.length} files...`);

  try {
    const r = await fetch("/api/upload", {
      method: "POST",
      headers: { Authorization: "Bearer " + state.token },
      body: fd,
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error);

    d.files.forEach((saved, i) => {
      const src = list[i];
      if (src && src.type?.startsWith("image/")) {
        try { saved.preview = URL.createObjectURL(src); } catch {}
      }
      state.attachments.push(saved);
    });
    render();
  } catch (err) { toast("Upload failed: " + err.message); }
}

async function send() {
  const typed = ($("#input")?.value ?? state.draft).trim();
  if ((!typed && !state.attachments.length) || state.runId) return;

  let prompt = typed;
  if (state.attachments.length) {
    const list = state.attachments.map((f) => `- ${f.path}`).join("\n");
    prompt = `${typed}\n\nAttached files (absolute paths on this machine):\n${list}`.trim();
  }

  state.messages.push({
    role: "user",
    parts: [
      ...(typed ? [{ kind: "text", text: typed }] : []),
      ...state.attachments.map((f) => ({ kind: "tool", name: "Attachment", input: { file_path: f.path } })),
    ],
  });
  state.draft = "";
  for (const f of state.attachments) if (f.preview) { try { URL.revokeObjectURL(f.preview); } catch {} }
  state.attachments = [];
  state.live = { text: "", thinking: "", tools: [], error: null, asks: [] };
  render();

  try {
    const r = await api("/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cwd: state.cwd, sessionId: state.sessionId, prompt, ...state.opts }),
    });
    state.sessionId = r.sessionId;
    attach(r.runId, Date.now());
  } catch (err) {
    detachStream();
    state.live = { text: "", thinking: "", tools: [], error: err.message, asks: [] };
    render();
  }
}

async function stop() {
  if (!state.runId) return;
  await api(`/run/${state.runId}/stop`, { method: "POST" }).catch(() => {});
}

/* ------------------------------------------------------------------ stream */
let runTicker = null;
function tickRuns() {
  clearInterval(runTicker);
  if (state.view !== "active" && !document.querySelector(".sw-row")) return;
  const paint = () => {
    for (const el of $$("[data-elapsed]")) {
      el.textContent = clock((Date.now() - Number(el.dataset.elapsed)) / 1000);
    }
  };
  paint();
  runTicker = setInterval(paint, 1000);
}

let poller = null;
function pollRuns() {
  clearInterval(poller);
  if (state.view !== "active") return;
  poller = setInterval(async () => {
    if (state.view !== "active" || document.hidden) return;
    const before = JSON.stringify(state.runs.map((r) => [r.runId, r.pending?.length || 0]));
    await refreshRuns();
    if (JSON.stringify(state.runs.map((r) => [r.runId, r.pending?.length || 0])) !== before) render();
  }, 4000);
}

let ticker = null;

function tick() {
  clearInterval(ticker);
  if (!state.runId) return;
  const paint = () => {
    const tx = $("#stx");
    if (!tx) return;
    if (state.live?.asks?.length) {
      tx.textContent = state.live.asks.some((a) => a.kind === "question")
        ? "Claude is asking you something"
        : "Waiting for your answer";
      return;
    }
    const el = Math.floor((Date.now() - state.runStart) / 1000);
    const idle = Math.floor((Date.now() - state.lastEventAt) / 1000);
    tx.textContent = `Working · ${clock(el)}` + (idle > 5 ? ` · quiet ${idle}s` : "");
  };
  paint();
  ticker = setInterval(paint, 1000);
}

function stream(runId, from = 0) {
  let consumed = from;
  const es = new EventSource(`/api/run/${runId}/stream?from=${consumed}&token=${encodeURIComponent(state.token)}`);
  state.stream = { runId, es };
  let raf = null;
  const paint = () => {
    if (!raf) raf = requestAnimationFrame(() => { raf = null; paintLive(); });
  };

  es.onmessage = (ev) => {
    if (state.stream?.es !== es || state.runId !== runId) { es.close(); return; }
    consumed++;
    state.lastEventAt = Date.now();
    let o;
    try { o = JSON.parse(ev.data); } catch { return; }
    const L = state.live;
    if (!L) return;

    if (o.session_id && o.session_id !== state.sessionId) {
      state.sessionId = o.session_id;
      saveActive({ runId, sessionId: state.sessionId, cwd: state.cwd });
    }

    switch (o.type) {
      case "stream_event": {
        const e = o.event;
        if (e?.type === "content_block_delta") {
          if (e.delta?.type === "text_delta") L.text += e.delta.text;
          else if (e.delta?.type === "thinking_delta") L.thinking += e.delta.thinking;
          paint();
        }
        return;
      }

      case "assistant": {
        for (const b of o.message?.content || []) {
          if (b.type === "tool_use" && !L.tools.some((t) => t.id === b.id)) {
            L.tools.push({ id: b.id, name: b.name, input: b.input });
          }
        }
        paint();
        return;
      }

      case "user": {
        for (const b of o.message?.content || []) {
          if (b.type !== "tool_result") continue;
          const t = L.tools.find((x) => x.id === b.tool_use_id);
          if (t) {
            t.result = {
              isError: !!b.is_error,
              text: typeof b.content === "string" ? b.content : (b.content || []).map((c) => c.text || "").join("\n"),
            };
          }
        }
        paint();
        return;
      }

      case "question_request": {
        if (!L.asks.some((x) => x.id === o.id)) L.asks.push(o);
        try { navigator.vibrate?.([80, 50, 80]); } catch {}
        render();
        return;
      }

      case "permission_request": {
        if (!L.asks.some((x) => x.id === o.id)) L.asks.push(o);
        try { navigator.vibrate?.([60, 40, 60]); } catch {}
        render();
        return;
      }

      case "permission_resolved": {
        L.asks = L.asks.filter((x) => x.id !== o.id);
        render();
        return;
      }

      case "runner_error": {
        L.error = o.message;
        paint();
        return;
      }

      case "result": {
        if (o.is_error) L.error = o.result || "Run failed";
        return;
      }

      case "runner_done": {
        es.close();
        state.stream = null;
        refreshUsage(true).then(() => render());
        clearInterval(ticker);
        state.runId = null;
        clearActive();
        const parts = [];
        if (L.thinking) parts.push({ kind: "thinking", text: L.thinking });
        for (const t of L.tools) parts.push({ kind: "tool", name: t.name, input: t.input, result: t.result });
        if (L.text) parts.push({ kind: "text", text: L.text });
        if (L.error) parts.push({ kind: "text", text: "Error: " + L.error });
        if (parts.length) state.messages.push({ role: "assistant", parts });
        state.live = null;
        render();
        return;
      }
    }
  };

  es.onerror = () => {
    es.close();
    if (state.stream?.es !== es || state.runId !== runId) return;
    state.stream = null;
    setTimeout(() => { if (state.runId === runId) stream(runId, consumed); }, 1500);
  };
}

/* ------------------------------------------------------------------ viewport */
function applyInset() {
  const px = Math.max(0, Math.min(240, parseInt(LS.getItem("cr_inset") || "0", 10) || 0));
  document.documentElement.style.setProperty("--extra-b", px + "px");
  return px;
}

function fitViewport() {
  const vv = window.visualViewport;
  const h = Math.round(vv ? vv.height : window.innerHeight);
  if (h > 0) document.documentElement.style.setProperty("--app-h", h + "px");
}

if (window.visualViewport) {
  visualViewport.addEventListener("resize", fitViewport);
  visualViewport.addEventListener("scroll", fitViewport);
}
window.addEventListener("resize", fitViewport);
window.addEventListener("orientationchange", () => setTimeout(fitViewport, 120));
fitViewport();
applyInset();

/* ------------------------------------------------------------------ pwa */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      reg.addEventListener("updatefound", () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", () => {
          if (sw.state === "installed" && navigator.serviceWorker.controller) sw.postMessage("skipWaiting");
        });
      });
    }).catch(() => {});
  });

  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

/* ------------------------------------------------------------------ boot */
async function boot() {
  if (!state.token) return render();
  await Promise.all([loadProjects(), loadFavorites()]);

  await refreshRuns();
  if (state.runs.some((r) => r.pending?.length)) {
    state.tab = "active";
    state.view = "active";
    render();
  }

  const a = loadActive();
  if (!a) return;
  const runs = await refreshRuns();
  const live = runs.find((r) => r.runId === a.runId && r.status === "running");
  if (!live) return clearActive();

  state.cwd = a.cwd;
  state.sessionId = a.sessionId || null;
  await loadHistory(a.runId);
}

let badgePoll = null;
function pollBadge() {
  clearInterval(badgePoll);
  badgePoll = setInterval(async () => {
    if (document.hidden || !state.token) return;
    if (state.view === "active") return;                 // that view polls on its own
    const before = JSON.stringify(state.runs.map((r) => [r.runId, r.pending?.length || 0]));
    await refreshRuns();
    const after = JSON.stringify(state.runs.map((r) => [r.runId, r.pending?.length || 0]));
    if (after === before) return;
    if (document.querySelector(".scrim")) return;         // do not yank a sheet away
    render();
  }, 8000);
}
pollBadge();

document.addEventListener("paste", (e) => {
  if (state.view !== "chat") return;
  const t = e.target;
  if (t && (t.id === "input" || t.closest?.(".composer"))) return;   // already handled there
  onPaste(e);
});

document.addEventListener("dragover", (e) => { if (state.view === "chat") e.preventDefault(); });
document.addEventListener("drop", (e) => { if (state.view === "chat") onDrop(e); });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && loadActive() && !state.runId) boot();
});

boot();
