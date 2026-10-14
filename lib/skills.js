import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, ".claude");
const USER_SKILLS = path.join(CLAUDE_DIR, "skills");
const PLUGIN_CACHE = path.join(CLAUDE_DIR, "plugins", "cache");
const SKIP_GROUPS = new Set(["deprecated", "in-progress"]);
const MAX_DEPTH = 4;

const TAG_RULES = [
  ["frontend", /\b(frontend|react|next\.?js|vue|svelte|component|css|tailwind|browser|ui kit|storybook)\b/i],
  ["backend", /\b(backend|api|server|fastapi|express|endpoint|database|sql|schema|migration|microservice|orm)\b/i],
  ["design", /\b(design|ux|user experience|interface|visual|figma|token|persona|journey|wireframe|mockup)\b/i],
  ["testing", /\b(test|tests|testing|tdd|qa|coverage|playwright|jest|vitest|pytest|e2e)\b/i],
  ["security", /\b(security|threat|vulnerab|pentest|secret|exploit|owasp|hardening|auth)\b/i],
  ["devops", /\b(docker|container|ci\/cd|deploy|infrastructure|kubernetes|pipeline|devops|terraform)\b/i],
  ["docs", /\b(document|docs|readme|spec|adr|changelog|writing|handoff)\b/i],
  ["data", /\b(chart|visuali[sz]|dataviz|analytics|dashboard|metric|graph)\b/i],
  ["review", /\b(review|audit|lint|refactor|simplif|code quality|debug|diagnos)\b/i],
  ["planning", /\b(plan|roadmap|priorit|research|discovery|architect|domain model|ticket)\b/i],
];

function tagsFor(name, description) {
  const hay = `${name} ${description}`;
  const tags = TAG_RULES.filter(([, pattern]) => pattern.test(hay)).map(([tag]) => tag);
  return tags.length ? tags : ["other"];
}

const cache = new Map();
const TTL_MS = 30_000;

function parseFrontmatter(text) {
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;

  const block = text.slice(3, end);
  const out = {};
  let key = null;

  for (const line of block.split("\n")) {
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (match) {
      key = match[1];
      out[key] = match[2].trim().replace(/^["']|["']$/g, "");
    } else if (key && /^\s+\S/.test(line)) {
      out[key] = `${out[key]} ${line.trim()}`.trim();
    }
  }
  return out;
}

async function walk(dir, depth, found) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_GROUPS.has(entry.name)) continue;
      await walk(full, depth + 1, found);
    } else if (entry.name === "SKILL.md") {
      found.push(full);
    }
  }
}

async function readSkill(file, source, prefix) {
  let raw;
  try {
    raw = await fsp.readFile(file, "utf8");
  } catch {
    return null;
  }

  const meta = parseFrontmatter(raw.slice(0, 4000));
  const fallback = path.basename(path.dirname(file));
  const name = (meta?.name || fallback).trim();
  if (!name) return null;

  const description = (meta?.description || "").slice(0, 400);
  return {
    id: prefix ? `${prefix}:${name}` : name,
    name,
    description,
    source,
    tags: tagsFor(name, description),
    modelInvocable: meta?.["disable-model-invocation"] !== "true",
  };
}

async function collectPluginSkills() {
  const out = [];
  let markets;
  try {
    markets = await fsp.readdir(PLUGIN_CACHE, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const market of markets) {
    if (!market.isDirectory()) continue;
    const marketDir = path.join(PLUGIN_CACHE, market.name);
    let plugins;
    try {
      plugins = await fsp.readdir(marketDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const plugin of plugins) {
      if (!plugin.isDirectory()) continue;
      const pluginDir = path.join(marketDir, plugin.name);
      let versions;
      try {
        versions = await fsp.readdir(pluginDir, { withFileTypes: true });
      } catch {
        continue;
      }

      for (const version of versions) {
        if (!version.isDirectory()) continue;
        const skillsDir = path.join(pluginDir, version.name, "skills");
        if (!fs.existsSync(skillsDir)) continue;
        const files = [];
        await walk(skillsDir, 0, files);
        for (const file of files) {
          const skill = await readSkill(file, "plugin", plugin.name);
          if (skill) out.push(skill);
        }
      }
    }
  }
  return out;
}

export async function listSkills(cwd) {
  const key = cwd || "";
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const personalFiles = [];
  await walk(USER_SKILLS, 0, personalFiles);
  const personal = (await Promise.all(personalFiles.map((file) => readSkill(file, "personal", null)))).filter(
    Boolean,
  );

  let project = [];
  if (cwd) {
    const projectFiles = [];
    await walk(path.join(cwd, ".claude", "skills"), 0, projectFiles);
    project = (await Promise.all(projectFiles.map((file) => readSkill(file, "project", null)))).filter(Boolean);
  }

  const plugin = await collectPluginSkills();

  const seen = new Set();
  const skills = [];
  for (const item of [...project, ...personal, ...plugin]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    skills.push(item);
  }

  skills.sort((a, b) => {
    const rank = { project: 0, personal: 1, plugin: 2 };
    const bySource = rank[a.source] - rank[b.source];
    return bySource !== 0 ? bySource : a.name.localeCompare(b.name);
  });

  const tally = new Map();
  for (const skill of skills) {
    for (const tag of skill.tags) tally.set(tag, (tally.get(tag) ?? 0) + 1);
  }
  const tags = [...tally.entries()]
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))
    .map(([tag, count]) => ({ tag, count }));

  const value = { skills, tags };
  cache.set(key, { at: Date.now(), value });
  return value;
}
