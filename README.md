# Remote for Claude Code

Use Claude Code from your phone.

Claude runs on your own machine, exactly as it always does. This adds a small
server next to it and an app you open from your phone. Your sessions, your files,
your skills — the same ones you already have.

<br>

## Why

You start Claude on something long. You leave your desk. Then you want to know:
did it finish? is it stuck? does it need me?

That is the whole product. Open the app, see what is happening, answer, get on
with your day.

<br>

## Install

Run one command on the machine where Claude Code works — your laptop, a desktop at
home, or a server you reach over SSH.

**macOS and Linux**

```bash
curl -fsSL https://raw.githubusercontent.com/mazyaryousefiniyaeshad/Claude-Code-Remote/master/install.sh | sh
```

**Windows** (PowerShell)

```powershell
irm https://raw.githubusercontent.com/mazyaryousefiniyaeshad/Claude-Code-Remote/master/install.ps1 | iex
```

The installer:

1. gets Node.js 22 if you do not have it (into its own folder, no admin needed)
2. asks one question: who may connect — only this computer, or your phone too
3. starts in the background, and again when the machine restarts
4. shows a QR code for your phone

Nothing else to set up. Everything lives in `~/.cc-remote`.

<br>

## Connect your phone

**Scan the QR code** with your phone's camera. The app opens and you are signed in.
Lost it? Run `cc-remote pair` to see it again.

**Android app.** Download [`cc-remote.apk`](https://github.com/mazyaryousefiniyaeshad/Claude-Code-Remote/releases/latest/download/cc-remote.apk),
open it, and paste the link that `cc-remote pair` shows.

**iPhone.** Open the link in Safari, then Share → Add to Home Screen. Open it from
the Home Screen and paste the token once; `cc-remote pair` shows it.

Your phone must be able to reach the machine:

- **Same Wi-Fi** — works as is.
- **Anywhere else** — install [Tailscale](https://tailscale.com) on both. The
  installer notices it and offers to listen only on Tailscale.
- **A server with only SSH** — choose "only this computer", then open a tunnel from
  your laptop. `cc-remote pair` prints the exact `ssh -L` command.

<br>

## Commands

| Command | What it does |
|---|---|
| `cc-remote setup` | Change who may connect, or the port; restarts it |
| `cc-remote pair` | Show the QR code, link and token |
| `cc-remote status` | Is it running, and where |
| `cc-remote login` | Sign in to Claude on this machine |
| `cc-remote start` · `stop` · `restart` | Control the background service |
| `cc-remote logs -f` | Follow the log |
| `cc-remote token --reset` | Make a new token; old devices must pair again |
| `cc-remote update` | Install the latest version |
| `cc-remote uninstall` | Remove it; `--purge` also deletes your data |

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

## Signing in to Claude

It uses the same sign-in as Claude Code on that machine. If Claude Code is not
signed in there yet, run `cc-remote login`.

To use an API key instead, set `ANTHROPIC_API_KEY` before you run `cc-remote setup`.
Setup saves it for the background service in `~/.cc-remote/config.json`, readable
only by you.

Anthropic's [Agent SDK documentation](https://code.claude.com/docs/en/agent-sdk/overview)
says third-party products may not offer claude.ai sign-in or plan limits without
Anthropic's approval. This tool runs on your own machine with your own sign-in, but
you are responsible for using it within Anthropic's terms. An API key is always
allowed.

<br>

## Security

**Anyone with your token can run any command on your machine.** Treat it like an SSH
key. `cc-remote token --reset` replaces it.

- By default it listens on this computer only. You choose to open it to your network.
- The connection is plain HTTP. Use it on your home Wi-Fi, over Tailscale or a VPN,
  or through an SSH tunnel. **Never expose it to the open internet.**
- Every API request needs the token, compared in constant time. It is only ever
  sent in a header, never in a URL.
- File browsing is limited to your home folder plus anything in `CC_REMOTE_ROOTS`.
  Symlinks that lead outside are refused.
- Permission mode defaults to **Ask me**: Claude stops and waits for you before it
  writes files or runs new commands. You can change it per session, up to
  **Never ask** — with full awareness of what that means.

<br>

## Configuration

`cc-remote setup` covers the usual choices. For anything else, these environment
variables override `~/.cc-remote/config.json`:

| Variable | Default | What it does |
|---|---|---|
| `CC_REMOTE_PORT` | `61777` | Port to listen on |
| `CC_REMOTE_HOST` | `127.0.0.1` | Address to listen on; `0.0.0.0` for every network |
| `CC_REMOTE_TOKEN` | generated | Access token; saved to `~/.cc-remote/token` if unset |
| `CC_REMOTE_ROOTS` | none | Extra folders Claude may reach besides your home folder; `:` separated (`;` on Windows) |
| `CC_REMOTE_HOME` | `~/.cc-remote` | Where the token, uploads, settings and logs live |
| `PERMISSION_TIMEOUT_MS` | `1800000` | How long a question waits before it gives up |
| `USAGE_TTL_MS` | `60000` | How long the plan-usage number is cached |

<br>

## Docker

Runs the server and Claude itself in a container. Your machine only needs Docker.

```bash
cp .env.example .env    # then edit it
docker compose up -d
```

Full guide, including what gets mounted and why: **[DOCKER.md](DOCKER.md)**

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

`AskUserQuestion` cannot run headlessly — allowing it just returns
`The user did not answer the questions.` So the server intercepts it, sends the
parsed question to your phone, and returns your answer through the one channel
`canUseTool` provides. Claude reads it as the answer and carries on.

<br>

## API

Every route needs `Authorization: Bearer <token>`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Liveness |
| `GET` | `/api/workspaces` | Folders that have sessions |
| `GET` | `/api/sessions?cwd=` | Sessions in a folder |
| `GET` | `/api/history?cwd=&sessionId=` | Messages; `limit` and `before` page backwards |
| `POST` | `/api/run` | Start a run |
| `POST` | `/api/run/:id/message` | Queue a message into a running session |
| `POST` | `/api/run/:id/unqueue` | Drop a queued message |
| `GET` | `/api/run/:id/stream` | Server-sent events; `?from=N` replays |
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
git clone https://github.com/mazyaryousefiniyaeshad/Claude-Code-Remote.git
cd Claude-Code-Remote
npm install
cd app && npm install && npm run build && cd ..
node bin/cc-remote.js run     # server on 61777, serves app/dist

cd app && npm run dev         # Vite on 61888 with hot reload
npm test                      # server tests
```

In dev, React Strict Mode runs effects twice, so streamed messages appear
duplicated. That is a dev-only artifact. Check anything that looks wrong against a
real build (`npm run build`) before chasing it.

```
bin/           the cc-remote command
lib/           server modules · config · background service
app/src/
  api/         client · types · react-query hooks · event stream
  lib/         storage · pairing · text direction · formatting · markdown · diff
  components/  Screen shell · primitives · switchers
  features/    home · sessions · chat · files · ports · settings · auth
  styles/      design tokens · base
```

Persian and English both render correctly — text direction is decided per line
from the actual characters, so mixed content works.

**Android build.** You need a JDK and the Android SDK:

```bash
cd app
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
```

The APK lands in `app/android/app/build/outputs/apk/debug/`.

<br>

## Releasing

Push a version tag. GitHub Actions builds the server package and the Android app and
publishes both as a release, which is where the installers and the app link look.

```bash
git tag v0.1.0
git push origin v0.1.0
```

Without signing secrets the APK is signed with a throwaway debug key, so people must
uninstall the old app before installing a new one. To sign every release with the
same key, run `scripts/android-keystore.sh` once and add the three values it prints
as repository secrets. Keep the keystore file safe.

<br>

## Requirements

- macOS, Linux or Windows
- A Claude account or an Anthropic API key
- Node.js 22 or newer — the installer gets it for you

<br>

## Licence

MIT

<br>

---

Remote for Claude Code is a community project. It is not made by, affiliated with, or
endorsed by Anthropic. Claude and Claude Code are trademarks of Anthropic, PBC.
