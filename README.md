# Remote for Claude Code

Use Claude Code from your phone.

Claude runs on your own machine, exactly as it always does. This adds a small
server next to it and a web app you open from anywhere on your private network.
Your sessions, your files, your skills — the same ones you already have.

<br>

## Why

You start Claude on something long. You leave your desk. Then you want to know:
did it finish? is it stuck? does it need me?

That is the whole product. Open the app, see what is happening, answer, get on
with your day.

<br>

## What you get

**Every session you already have.** It reads Claude Code's own transcripts, so
nothing is separate and nothing is duplicated. Start work at your desk, continue
from your phone.

**Answers to Claude's questions.** When Claude asks permission or asks you to
choose, the app shows the real question with real options. Tap and it continues.

**A queue.** Send a message while Claude is still working and it lines up. It
runs in the same session as soon as the current turn finishes.

**Your skills, on tap.** Pick from your own skills, your project's skills, and
your plugins. They get added to your message automatically.

**Live streaming.** Text, thinking, tool calls with diffs — as they happen.

**Attachments.** Paperclip, paste, or drag. Images get a preview.

**Plan usage.** How much of your 5-hour and 7-day window is left.

<br>

## Install

You need Node 22 or newer and Claude Code already working on this machine.

```bash
git clone https://github.com/mazyaryousefiniyaeshad/cc-remote.git
cd cc-remote
npm install
cd app && npm install && npm run build && cd ..
node server.js
```

The first run prints an access token and saves it to `~/.cc-remote/token`.

Open `http://localhost:61777` and paste the token.

### From your phone

Bind to the network instead of just localhost:

```bash
CC_REMOTE_HOST=0.0.0.0 node server.js
```

Then open `http://<your-machine-ip>:61777` from any device on the same network.

Find your IP with `ipconfig getifaddr en0` on macOS or `hostname -I` on Linux.

> **Use a private network.** Tailscale, a VPN, or your home LAN. This server can
> run any command on your machine. Do not put it on the open internet.

<br>

## Docker

Runs the server and Claude itself in a container. Your machine only needs Docker.

```bash
cp .env.example .env    # then edit it
docker compose up -d
```

Full guide, including what gets mounted and why: **[DOCKER.md](DOCKER.md)**

<br>

## Android

There is an APK on the [releases page](https://github.com/mazyaryousefiniyaeshad/cc-remote/releases). Install it, then enter
your server address and token on first launch.

To build it yourself you need a JDK and the Android SDK:

```bash
brew install openjdk@21 android-commandlinetools
sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0"

cd app
. ./android-env.sh
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK lands in `app/android/app/build/outputs/apk/debug/`.

The app bundles its own copy of the web files, so any UI change needs a rebuild.
The browser version updates immediately.

<br>

## Configuration

Everything is optional.

| Variable | Default | What it does |
|---|---|---|
| `CC_REMOTE_PORT` | `61777` | Port to listen on |
| `CC_REMOTE_HOST` | `127.0.0.1` | Bind address; `0.0.0.0` to reach it from other devices |
| `CC_REMOTE_TOKEN` | generated | Access token; saved to `~/.cc-remote/token` if unset |
| `CC_REMOTE_ROOTS` | none | Extra folders Claude may reach, besides your home folder; `:` separated (`;` on Windows) |
| `PERMISSION_TIMEOUT_MS` | `1800000` | How long a question waits before it gives up |
| `USAGE_TTL_MS` | `60000` | How long the plan-usage number is cached |

<br>

## How it works

```
your phone  ──►  server on your machine  ──►  Claude Agent SDK  ──►  Claude
                 reads ~/.claude/projects
```

The server talks to Claude through `@anthropic-ai/claude-agent-sdk`, not the CLI.
That is deliberate: the SDK exposes `canUseTool`, which is the only way to catch a
permission prompt and forward it to your phone.

Each session is one long-lived streaming query. Messages you queue get pushed into
the same query, so Claude sees them in context rather than as a fresh conversation.

Session history lives where Claude Code already puts it,
`~/.claude/projects/<slug>/<session>.jsonl`. Restarting the server loses nothing.

### Claude's own questions

`AskUserQuestion` cannot run headlessly — allowing it just returns
`The user did not answer the questions.` So the server intercepts it, sends the
parsed question to your phone, and returns your answer through the one channel
`canUseTool` provides. Claude reads it as the answer and carries on.

<br>

## Security

- Every `/api/*` route needs a bearer token, compared in constant time
- File browsing is limited to `$HOME` plus anything in `CC_REMOTE_ROOTS`
- The token file is `chmod 600`
- Nothing is exposed beyond the network you bind to

Permission mode defaults to **Ask me**, so Claude stops and waits for you before
writing files or running new commands. You can change it per session, up to
**Never ask** — with full awareness of what that means.

**Be honest about the threat model.** Anyone with your token can run anything on
your machine, inside whatever folders you allowed. Treat the token like an SSH key.

<br>

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness |
| `GET` | `/api/workspaces` | Folders that have sessions |
| `GET` | `/api/sessions?cwd=` | Sessions in a folder |
| `GET` | `/api/history?cwd=&sessionId=` | Messages; `limit` and `before` page backwards |
| `POST` | `/api/run` | Start a run |
| `POST` | `/api/run/:id/message` | Queue a message into a running session |
| `POST` | `/api/run/:id/unqueue` | Drop a queued message |
| `GET` | `/api/run/:id/stream` | SSE events; `?from=N` replays |
| `POST` | `/api/run/:id/permission` | Answer a permission prompt |
| `POST` | `/api/run/:id/answer` | Answer Claude's question |
| `POST` | `/api/run/:id/stop` | Abort |
| `GET` | `/api/runs` | Live runs, their prompts and queues |
| `GET` | `/api/skills?cwd=` | Skills available in that folder |
| `GET` | `/api/favorites` · `POST` | Starred sessions |
| `POST` | `/api/upload` | Multipart upload |
| `GET` | `/api/fs?path=` | Directory listing |
| `GET` | `/api/file?path=` | Read a text file |
| `GET` | `/api/thumb?path=` | Serve an uploaded image |
| `GET` | `/api/ports` | Listening ports |
| `GET` | `/api/usage` | Plan limit windows |

<br>

## Development

```bash
node server.js                 # server on 61777, serves app/dist

cd app && npm run dev          # Vite on 61888 with hot reload
```

In dev, React Strict Mode runs effects twice, so streamed messages appear
duplicated. That is a dev-only artifact. Check anything that looks wrong against a
real build (`npm run build`) before chasing it.

```
app/src/
  api/         client · types · react-query hooks · SSE engine
  lib/         storage · text direction · formatting · markdown · diff
  components/  Screen shell · primitives · switchers
  features/    home · sessions · chat · files · ports · settings · auth
  styles/      design tokens · base
```

Persian and English both render correctly — text direction is decided per line
from the actual characters, so mixed content works.

<br>

## Requirements

- Node 22+
- Claude Code, signed in
- macOS or Linux

<br>

## Licence

MIT

<br>

---

Remote for Claude Code is a community project. It is not made by, affiliated with, or
endorsed by Anthropic. Claude and Claude Code are trademarks of Anthropic, PBC.
