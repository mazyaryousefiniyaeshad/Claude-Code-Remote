# Running Claude Remote in Docker

The container runs the server and Claude Code itself. Your machine only needs Docker.

## Setup

```bash
cp .env.example .env
```

Edit `.env`:

```
CR_TOKEN=<a long random string you invent>
CR_PORT=61777
CR_BIND=127.0.0.1
CR_WORKSPACE=/Users/you/Projects
CR_CLAUDE_DIR=/Users/you/.claude
CR_DATA_DIR=/Users/you/.claude-remote
```

Then:

```bash
docker compose up -d
```

Open `http://localhost:61777` and paste `CR_TOKEN`.

To reach it from your phone, set `CR_BIND=0.0.0.0` (or your Tailscale IP) and use
`http://<this-machine>:61777` instead.

## What gets mounted and why

| Mount | Why |
|---|---|
| `~/.claude` | Your credentials, session transcripts, skills, settings |
| `~/.claude.json` | Claude's own config file — it lives beside the folder, not inside it |
| `~/.claude-remote` | Uploads, favourites, logs |
| `CR_WORKSPACE` | The project tree Claude works in |

The workspace is mounted at the **same absolute path** inside the container. That
keeps every path Claude prints copy-pasteable on the host.

## Isolation

The file browser and every run's `cwd` can reach the container's home directory
(which holds the mounted `~/.claude` and `~/.claude-remote`) plus the workspace, which
`CR_ALLOWED_ROOTS` adds. Claude cannot reach anything else on the host, because
nothing else is mounted. That is a real improvement over running the server directly
on the host, where your whole home directory is reachable.

It is **not** a sandbox against a determined attacker who already has your token.
Inside the workspace, Claude runs arbitrary commands by design.

## Add `~/.claude.json` to compose

`compose.yml` does not mount it by default because its location varies. Add:

```yaml
      - "${CR_CLAUDE_JSON:-${HOME}/.claude.json}:/home/node/.claude.json"
```

## Requirements

Docker needs enough disk for the image plus Claude's scratch space. If a run fails
with `ENOSPC: no space left on device`, reclaim space:

```bash
docker system prune -a
```

Docker Desktop's VM has its own disk, separate from the host's free space. Check it
with `docker system df`.

## Verified

```
container            healthy
GET /                200
GET /api/health      200
GET /api/workspaces  200, 8 projects visible

run: "uname -s -m"  ->  Linux aarch64
```

That last line is the proof: the run executed inside the Linux container, not on the
macOS host.

## Auth caveat

This works because Claude stores credentials in `~/.claude/.credentials.json` on this
machine. If your install keeps them in the macOS Keychain instead, the container
cannot read them and you must log in inside the container once:

```bash
docker compose exec claude-remote claude
```
