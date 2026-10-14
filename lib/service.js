import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DATA_DIR, LOG_DIR, LOG_FILE, PID_FILE } from "./config.js";

export const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SERVER = path.join(APP_DIR, "server.js");
const CLI = path.join(APP_DIR, "bin", "cc-remote.js");
const NODE = process.execPath;
const LABEL = "io.github.mazyaryousefiniyaeshad.cc-remote";
const UNIT = "cc-remote";
const CRON_MARK = "# cc-remote";

const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { encoding: "utf8", ...opts });
const ok = (cmd, args) => run(cmd, args, { stdio: "ignore" }).status === 0;

function serverEnv() {
  const env = { ...process.env };
  delete env.PORT;
  delete env.HOST;
  return env;
}

function xml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === "EPERM";
  }
}

function readPid() {
  try {
    const pid = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    return pid > 0 && pidAlive(pid) ? pid : null;
  } catch {
    return null;
  }
}

const detached = {
  start() {
    if (readPid()) return;
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const out = fs.openSync(LOG_FILE, "a");
    const child = spawn(NODE, [SERVER], {
      cwd: APP_DIR,
      detached: true,
      stdio: ["ignore", out, out],
      windowsHide: true,
      env: serverEnv(),
    });
    child.unref();
    fs.writeFileSync(PID_FILE, String(child.pid));
  },
  stop() {
    const pid = readPid();
    if (pid) {
      try {
        process.kill(pid);
      } catch {
        return;
      }
    }
    fs.rmSync(PID_FILE, { force: true });
  },
  running: () => Boolean(readPid()),
};

const launchd = {
  plist: path.join(os.homedir(), "Library", "LaunchAgents", `${LABEL}.plist`),
  domains: () => [`gui/${process.getuid()}`, `user/${process.getuid()}`],
  domain: () => launchd.domains().find((domain) => ok("launchctl", ["print", `${domain}/${LABEL}`])) ?? null,
  loaded() {
    return Boolean(launchd.domain());
  },
  write() {
    fs.mkdirSync(path.dirname(launchd.plist), { recursive: true });
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(NODE)}</string>
    <string>${xml(SERVER)}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${xml(APP_DIR)}</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>${xml(process.env.PATH || "/usr/bin:/bin")}</string>
    <key>HOME</key>
    <string>${xml(os.homedir())}</string>
  </dict>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>10</integer>
  <key>StandardOutPath</key>
  <string>${xml(LOG_FILE)}</string>
  <key>StandardErrorPath</key>
  <string>${xml(LOG_FILE)}</string>
</dict>
</plist>
`;
    fs.writeFileSync(launchd.plist, body);
  },
  start() {
    const loaded = launchd.domain();
    if (loaded) return ok("launchctl", ["kickstart", "-k", `${loaded}/${LABEL}`]);
    return launchd.domains().some((domain) => ok("launchctl", ["bootstrap", domain, launchd.plist]));
  },
  stop() {
    const loaded = launchd.domain();
    if (loaded) run("launchctl", ["bootout", `${loaded}/${LABEL}`]);
  },
  remove() {
    launchd.stop();
    fs.rmSync(launchd.plist, { force: true });
  },
};

const systemd = {
  unit: path.join(os.homedir(), ".config", "systemd", "user", `${UNIT}.service`),
  available: () => ok("systemctl", ["--user", "show-environment"]),
  write() {
    fs.mkdirSync(path.dirname(systemd.unit), { recursive: true });
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const quote = (value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
    fs.writeFileSync(
      systemd.unit,
      `[Unit]
Description=Remote for Claude Code
After=network-online.target

[Service]
ExecStart=${quote(NODE)} ${quote(SERVER)}
WorkingDirectory=${quote(APP_DIR)}
Environment=${quote(`PATH=${process.env.PATH || "/usr/bin:/bin"}`)}
Environment=${quote(`HOME=${os.homedir()}`)}
Restart=always
RestartSec=5
StandardOutput=append:${LOG_FILE}
StandardError=append:${LOG_FILE}

[Install]
WantedBy=default.target
`,
    );
    run("systemctl", ["--user", "daemon-reload"]);
  },
  start: () => ok("systemctl", ["--user", "enable", "--now", UNIT]) && ok("systemctl", ["--user", "restart", UNIT]),
  stop: () => run("systemctl", ["--user", "stop", UNIT]),
  remove() {
    run("systemctl", ["--user", "disable", "--now", UNIT]);
    fs.rmSync(systemd.unit, { force: true });
    run("systemctl", ["--user", "daemon-reload"]);
  },
  linger: () => ok("loginctl", ["enable-linger", os.userInfo().username]),
};

const cron = {
  available: () => ok("sh", ["-c", "command -v crontab"]),
  lines() {
    const current = run("crontab", ["-l"]);
    return current.status === 0 ? current.stdout.split("\n").filter((line) => line && !line.endsWith(CRON_MARK)) : [];
  },
  save(lines) {
    run("crontab", ["-"], { input: lines.join("\n") + "\n" });
  },
  add() {
    cron.save([...cron.lines(), `@reboot "${NODE}" "${CLI}" start ${CRON_MARK}`]);
  },
  remove() {
    cron.save(cron.lines());
  },
};

const startup = {
  link: path.join(
    process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
    "Microsoft",
    "Windows",
    "Start Menu",
    "Programs",
    "Startup",
    "cc-remote.lnk",
  ),
  add() {
    const ps = [
      "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($env:CC_LINK)",
      "$s.TargetPath = $env:CC_NODE",
      '$s.Arguments = """$env:CC_CLI"" start"',
      "$s.WorkingDirectory = $env:CC_APP",
      "$s.WindowStyle = 7",
      "$s.Save()",
    ].join("; ");
    return run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps], {
      env: { ...process.env, CC_LINK: startup.link, CC_NODE: NODE, CC_CLI: CLI, CC_APP: APP_DIR },
    }).status === 0;
  },
  remove() {
    fs.rmSync(startup.link, { force: true });
  },
};

export function install() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const notes = [];

  if (process.platform === "darwin") {
    launchd.write();
    if (launchd.start()) return { kind: "launchd", notes };
    notes.push("Started for now. It starts on its own the next time you log in to this Mac.");
    detached.start();
    return { kind: "launchd-pending", notes };
  }

  if (process.platform === "win32") {
    if (!startup.add()) notes.push("Could not add it to Windows startup. Run `cc-remote start` after each restart.");
    detached.start();
    return { kind: "startup", notes };
  }

  if (systemd.available()) {
    systemd.write();
    if (systemd.start()) {
      if (!systemd.linger()) {
        notes.push(
          "It stops when you log out. To keep it running, ask an admin to run: sudo loginctl enable-linger " +
            os.userInfo().username,
        );
      }
      return { kind: "systemd", notes };
    }
  }

  detached.start();
  if (cron.available()) {
    cron.add();
    return { kind: "cron", notes };
  }
  notes.push("No service manager found. Run `cc-remote start` after each restart.");
  return { kind: "manual", notes };
}

export function start(kind) {
  if (kind === "launchd" && launchd.start()) return;
  if (kind === "systemd" && systemd.start()) return;
  detached.start();
}

export function stop(kind) {
  if (kind === "launchd" || kind === "launchd-pending") launchd.stop();
  if (kind === "systemd") systemd.stop();
  detached.stop();
}

export function uninstall(kind) {
  stop(kind);
  if (process.platform === "darwin") launchd.remove();
  if (process.platform === "win32") startup.remove();
  if (process.platform === "linux") {
    if (fs.existsSync(systemd.unit)) systemd.remove();
    if (cron.available()) cron.remove();
  }
}

export function describe(kind) {
  return (
    {
      launchd: "macOS login item (launchd)",
      "launchd-pending": "macOS login item (starts at next login)",
      systemd: "systemd user service",
      startup: "Windows startup",
      cron: "background process, restarted at boot by cron",
      manual: "background process",
    }[kind] || "not set up"
  );
}
