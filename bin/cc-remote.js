#!/usr/bin/env node
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import readline from "node:readline/promises";
import { spawn, spawnSync } from "node:child_process";
import qrcode from "qrcode-terminal";
import { DATA_DIR, DEFAULT_PORT, LOG_FILE, readConfig, writeConfig } from "../lib/config.js";
import { ensureToken, readToken, resetToken } from "../lib/token.js";
import * as service from "../lib/service.js";

const REPO = "mazyaryousefiniyaeshad/Claude-Code-Remote";
const APK_URL = `https://github.com/${REPO}/releases/latest/download/cc-remote.apk`;
const INSTALL_SH = `https://raw.githubusercontent.com/${REPO}/master/install.sh`;
const INSTALL_PS1 = `https://raw.githubusercontent.com/${REPO}/master/install.ps1`;

const [command = "help", ...rest] = process.argv.slice(2);
const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
const option = (name) => {
  const at = rest.indexOf(name);
  return at >= 0 ? rest[at + 1] : undefined;
};

const bold = (text) => (process.stdout.isTTY ? `\x1b[1m${text}\x1b[0m` : text);
const dim = (text) => (process.stdout.isTTY ? `\x1b[2m${text}\x1b[0m` : text);
const say = (text = "") => console.log(text);

function config() {
  const file = readConfig();
  return { host: file.host || "127.0.0.1", port: Number(file.port) || DEFAULT_PORT, ...file };
}

function isLocalHost(host) {
  return ["127.0.0.1", "localhost", "::1"].includes(host);
}

function isWildcard(host) {
  return host === "0.0.0.0" || host === "::";
}

function kindOf(address) {
  const [a, b] = address.split(".").map(Number);
  if (a === 100 && b >= 64 && b <= 127) return "Tailscale";
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "Local network";
  return "Network";
}

function addresses() {
  const out = [];
  for (const [name, entries] of Object.entries(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      const kind = kindOf(entry.address);
      if (kind !== "Tailscale" && /^(docker|br-|veth|vboxnet|vmnet|virbr)/.test(name)) continue;
      out.push({ kind, address: entry.address });
    }
  }
  const rank = { Tailscale: 0, "Local network": 1, Network: 2 };
  return out.sort((x, y) => rank[x.kind] - rank[y.kind]);
}

function urlsFor({ host, port }) {
  if (isLocalHost(host)) return [];
  if (isWildcard(host)) return addresses().map((entry) => ({ kind: entry.kind, url: `http://${entry.address}:${port}` }));
  return [{ kind: kindOf(host), url: `http://${host}:${port}` }];
}

function probeHost(host) {
  return isLocalHost(host) || isWildcard(host) ? "127.0.0.1" : host;
}

async function health(cfg = config()) {
  const token = readToken()?.token;
  if (!token) return false;
  try {
    const res = await fetch(`http://${probeHost(cfg.host)}:${cfg.port}/api/health`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function waitHealthy(seconds = 20) {
  for (let i = 0; i < seconds * 2; i += 1) {
    if (await health()) return true;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function answers(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host });
    socket.setTimeout(800);
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", () => resolve(false));
  });
}

async function waitStopped(port, seconds = 10) {
  for (let i = 0; i < seconds * 4; i += 1) {
    if (!(await answers(port, "127.0.0.1"))) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

function canListen(port, host) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, host, () => probe.close(() => resolve(true)));
  });
}

async function portFree(port, host) {
  if (await answers(port, "127.0.0.1")) return false;
  if (!isWildcard(host) && !isLocalHost(host) && (await answers(port, host))) return false;
  return canListen(port, isWildcard(host) ? "0.0.0.0" : host);
}

function claudeBinary() {
  const name = `claude-agent-sdk-${process.platform}-${process.arch}`;
  const file = process.platform === "win32" ? "claude.exe" : "claude";
  for (const pkg of [name, `${name}-musl`]) {
    const candidate = path.join(service.APP_DIR, "node_modules", "@anthropic-ai", pkg, file);
    if (fs.existsSync(candidate)) return candidate;
  }
  return "claude";
}

function signedIn() {
  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_CODE_OAUTH_TOKEN) return true;
  const env = readConfig().env ?? {};
  if (env.ANTHROPIC_API_KEY || env.CLAUDE_CODE_OAUTH_TOKEN) return true;
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  if (fs.existsSync(path.join(dir, ".credentials.json"))) return true;
  if (process.platform === "darwin") {
    return spawnSync("security", ["find-generic-password", "-s", "Claude Code-credentials"], { stdio: "ignore" }).status === 0;
  }
  return false;
}

function interactive() {
  return process.stdin.isTTY && !flags.has("--yes");
}

async function ask(question, fallback) {
  if (!interactive()) return fallback;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = (await rl.question(question)).trim();
    return answer || fallback;
  } finally {
    rl.close();
  }
}

function login() {
  say("Claude Code will open. If it asks you to sign in, follow the steps.");
  say("When you see the prompt, type /exit to come back here.");
  say();
  spawnSync(claudeBinary(), [], { stdio: "inherit" });
}

async function chooseHost(current) {
  if (flags.has("--local")) return "127.0.0.1";
  if (flags.has("--network")) return "0.0.0.0";
  const tailscale = addresses().find((entry) => entry.kind === "Tailscale");
  if (flags.has("--tailscale")) {
    if (!tailscale) throw new Error("No Tailscale address found on this machine.");
    return tailscale.address;
  }
  if (!interactive()) return current || "127.0.0.1";

  say(bold("Where will you open it from?"));
  say("  1) Only this computer (safest; from elsewhere, use an SSH tunnel)");
  say("  2) My phone and other devices on my network");
  if (tailscale) say(`  3) Only over Tailscale (${tailscale.address})`);
  const fallback = tailscale ? "3" : "2";
  const answer = await ask(`Choose [${fallback}]: `, fallback);
  if (answer === "1") return "127.0.0.1";
  if (answer === "3" && tailscale) return tailscale.address;
  return "0.0.0.0";
}

async function choosePort(host, wanted) {
  for (let port = wanted; port < wanted + 50; port += 1) {
    if (await portFree(port, host)) return port;
  }
  throw new Error(`No free port found near ${wanted}.`);
}

async function setup() {
  say(bold("Remote for Claude Code — setup"));
  say();

  if (!signedIn()) {
    say("Claude Code is not signed in on this machine yet.");
    if (interactive() && (await ask("Sign in now? [Y/n] ", "y")).toLowerCase().startsWith("y")) login();
    if (!signedIn()) say(dim("Sign in later with: cc-remote login"));
    say();
  }

  const current = config();
  const host = await chooseHost(current.host);
  const wantedPort = Number(option("--port")) || current.port;
  service.stop(current.service);
  await waitStopped(current.port);
  const port = await choosePort(host, wantedPort);

  const env = { ...(current.env ?? {}) };
  for (const key of ["ANTHROPIC_API_KEY", "CLAUDE_CODE_OAUTH_TOKEN"]) {
    if (process.env[key] && !env[key]) env[key] = process.env[key];
  }

  writeConfig({ ...current, host, port, env, service: undefined });
  ensureToken();

  const result = service.install();
  writeConfig({ ...readConfig(), service: result.kind });

  say();
  if (await waitHealthy()) say(`Running as a ${service.describe(result.kind)}.`);
  else say(`It did not answer yet. Check the log with: cc-remote logs`);
  for (const note of result.notes) say(dim(note));
  say();
  await pair();
}

async function pair() {
  const cfg = config();
  const token = ensureToken().token;
  const urls = urlsFor(cfg);

  if (!urls.length) {
    const local = `http://localhost:${cfg.port}`;
    say(bold("Open on this computer:"));
    say(`  ${local}/#pair=${token}`);
    say();
    say("From another computer, connect with an SSH tunnel first:");
    say(`  ssh -N -L ${cfg.port}:127.0.0.1:${cfg.port} ${os.userInfo().username}@${os.hostname()}`);
    say(`  then open ${local}/#pair=${token}`);
    say();
    say(dim("To use it from your phone, run: cc-remote setup --network"));
    return;
  }

  const link = `${urls[0].url}/#pair=${token}`;
  say(bold("On your phone, scan this with the camera:"));
  qrcode.generate(link, { small: true }, (code) => say(code));
  say(`Or open: ${link}`);
  if (urls.length > 1) {
    say();
    say("Other addresses:");
    for (const entry of urls.slice(1)) say(`  ${entry.url}   ${dim(entry.kind)}`);
  }
  say();
  say(`Token: ${token}`);
  say(`Android app: ${APK_URL}`);
  say(dim("In the app, paste the link above, or the address and token."));
}

async function status() {
  const cfg = config();
  const up = await health(cfg);
  say(`${bold("Status:")} ${up ? "running" : "not running"}`);
  say(`${bold("Started by:")} ${service.describe(cfg.service)}`);
  say(`${bold("Listening on:")} ${cfg.host}:${cfg.port}`);
  for (const entry of urlsFor(cfg)) say(`  ${entry.url}   ${dim(entry.kind)}`);
  say(`${bold("Data:")} ${DATA_DIR}`);
  say(`${bold("Program:")} ${service.APP_DIR}`);
  say(`${bold("Signed in to Claude:")} ${signedIn() ? "yes" : "no (run: cc-remote login)"}`);
  if (!up) process.exitCode = 1;
}

async function start() {
  const cfg = config();
  if (await health(cfg)) return say("Already running.");
  service.start(cfg.service);
  say((await waitHealthy()) ? "Started." : "It did not start. Check: cc-remote logs");
}

async function stop() {
  const cfg = config();
  service.stop(cfg.service);
  await waitStopped(cfg.port);
  say("Stopped.");
}

function logs() {
  if (!fs.existsSync(LOG_FILE)) return say("No logs yet.");
  const lines = fs.readFileSync(LOG_FILE, "utf8").split("\n");
  say(lines.slice(-80).join("\n"));
  if (!flags.has("-f") && !rest.includes("-f")) return;
  let size = fs.statSync(LOG_FILE).size;
  fs.watchFile(LOG_FILE, { interval: 500 }, (stat) => {
    if (stat.size < size) size = 0;
    if (stat.size === size) return;
    const fd = fs.openSync(LOG_FILE, "r");
    const buffer = Buffer.alloc(stat.size - size);
    fs.readSync(fd, buffer, 0, buffer.length, size);
    fs.closeSync(fd);
    size = stat.size;
    process.stdout.write(buffer);
  });
}

async function token() {
  if (flags.has("--reset")) {
    resetToken();
    const cfg = config();
    service.stop(cfg.service);
    await waitStopped(cfg.port);
    service.start(cfg.service);
    await waitHealthy();
    say("New token made. Devices that used the old one must pair again:");
    say();
    return pair();
  }
  say(ensureToken().token);
}

function update() {
  if (fs.existsSync(path.join(service.APP_DIR, ".git"))) {
    say("This copy is a git checkout. Update it with: git pull, then cc-remote restart");
    return;
  }
  const env = { ...process.env, CC_REMOTE_UPDATE: "1" };
  const result =
    process.platform === "win32"
      ? spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `irm ${INSTALL_PS1} | iex`], { stdio: "inherit", env })
      : spawnSync("sh", ["-c", `curl -fsSL ${INSTALL_SH} | sh`], { stdio: "inherit", env });
  process.exitCode = result.status ?? 1;
}

function removeLater(targets) {
  if (process.platform !== "win32") {
    for (const target of targets) fs.rmSync(target, { recursive: true, force: true });
    return;
  }
  const steps = ["ping -n 4 127.0.0.1 >nul", ...targets.map((target) => `rmdir /s /q "${target}" 2>nul`)];
  spawn("cmd.exe", ["/d", "/s", "/c", `"${steps.join(" & ")}"`], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    windowsVerbatimArguments: true,
  }).unref();
}

async function uninstall() {
  const cfg = config();
  service.uninstall(cfg.service);
  await waitStopped(cfg.port);
  writeConfig({ ...readConfig(), service: undefined });
  say("Stopped and removed from startup.");
  const installed = service.APP_DIR === path.join(DATA_DIR, "app");
  const targets = [];
  if (flags.has("--purge")) {
    say(`Deleting ${DATA_DIR} (token, uploads, settings${installed ? ", program" : ""}).`);
    targets.push(DATA_DIR);
  } else {
    say(dim(`Your token, uploads and settings are still in ${DATA_DIR}. Add --purge to delete them.`));
    if (installed) targets.push(path.join(DATA_DIR, "app"), path.join(DATA_DIR, "node"));
  }
  if (installed) {
    targets.push(process.platform === "win32" ? path.join(DATA_DIR, "bin") : path.join(os.homedir(), ".local", "bin", "cc-remote"));
  }
  removeLater(targets);
}

function help() {
  say(`${bold("cc-remote")} — use Claude Code from your phone

  cc-remote setup       Pick who can connect, start in the background, show the QR code
  cc-remote pair        Show the QR code, link and token for your phone
  cc-remote status      Is it running, and where
  cc-remote login       Sign in to Claude on this machine
  cc-remote start       Start in the background
  cc-remote stop        Stop
  cc-remote restart     Restart
  cc-remote logs [-f]   Show the log (-f keeps following it)
  cc-remote token       Show the token (--reset makes a new one)
  cc-remote update      Install the latest version
  cc-remote uninstall   Stop and remove it (--purge also deletes your data)
  cc-remote run         Run in this terminal instead of the background

setup options: --network | --local | --tailscale, --port <n>, --yes`);
}

const commands = {
  setup,
  pair,
  status,
  login,
  start,
  stop,
  restart: async () => {
    await stop();
    await start();
  },
  logs,
  token,
  update,
  uninstall,
  run: () => import("../server.js"),
  help,
  "--help": help,
  "-h": help,
  "--version": () => say(JSON.parse(fs.readFileSync(path.join(service.APP_DIR, "package.json"), "utf8")).version),
};

const handler = commands[command];
if (!handler) {
  say(`Unknown command: ${command}`);
  help();
  process.exitCode = 1;
} else {
  Promise.resolve(handler()).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
