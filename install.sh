#!/bin/sh
set -eu

REPO="mazyaryousefiniyaeshad/Claude-Code-Remote"
NODE_MAJOR=22
DATA_DIR="${CC_REMOTE_HOME:-$HOME/.cc-remote}"
APP_DIR="$DATA_DIR/app"
NODE_DIR="$DATA_DIR/node"
BIN_DIR="$HOME/.local/bin"

say() { printf '%s\n' "$*"; }
fail() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

fetch() {
  if command -v curl >/dev/null 2>&1; then
    curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -q -O "$2" "$1"
  else
    fail "curl or wget is needed"
  fi
}

node_ok() {
  "$1" -e "process.exit(Number(process.versions.node.split('.')[0]) >= $NODE_MAJOR ? 0 : 1)" >/dev/null 2>&1
}

sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | cut -d' ' -f1
  else
    shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

command -v tar >/dev/null 2>&1 || fail "tar is needed"

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

NODE=""
if [ -x "$NODE_DIR/bin/node" ] && node_ok "$NODE_DIR/bin/node"; then
  NODE="$NODE_DIR/bin/node"
elif command -v node >/dev/null 2>&1 && node_ok node; then
  NODE=$(command -v node)
else
  case "$(uname -s)" in
    Darwin) platform=darwin ;;
    Linux) platform=linux ;;
    *) fail "this script supports macOS and Linux; on Windows use install.ps1" ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch=x64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *) fail "unsupported CPU: $(uname -m)" ;;
  esac
  if [ "$platform" = linux ] && ldd --version 2>&1 | grep -qi musl; then
    fail "on Alpine, install Node.js $NODE_MAJOR or newer first (apk add nodejs npm), then run this again"
  fi

  say "Downloading Node.js $NODE_MAJOR..."
  base="https://nodejs.org/dist/latest-v$NODE_MAJOR.x"
  fetch "$base/SHASUMS256.txt" "$tmp/SHASUMS256.txt"
  line=$(grep " node-v[0-9.]*-$platform-$arch.tar.gz\$" "$tmp/SHASUMS256.txt" | head -n 1)
  [ -n "$line" ] || fail "no Node.js build for $platform-$arch"
  file=${line##* }
  fetch "$base/$file" "$tmp/$file"
  [ "$(sha256 "$tmp/$file")" = "${line%% *}" ] || fail "Node.js download is corrupt, try again"
  rm -rf "$NODE_DIR"
  mkdir -p "$NODE_DIR"
  tar -xzf "$tmp/$file" -C "$NODE_DIR" --strip-components=1
  NODE="$NODE_DIR/bin/node"
fi

NODE_BIN=$(dirname "$NODE")
PATH="$NODE_BIN:$PATH"
export PATH
command -v npm >/dev/null 2>&1 || fail "npm was not found next to $NODE"

say "Downloading Remote for Claude Code..."
prebuilt=1
if [ -n "${CC_REMOTE_SOURCE:-}" ]; then
  cp "$CC_REMOTE_SOURCE" "$tmp/cc-remote.tgz"
  tar -xzf "$tmp/cc-remote.tgz" -C "$tmp"
  src="$tmp/cc-remote"
elif fetch "https://github.com/$REPO/releases/latest/download/cc-remote.tgz" "$tmp/cc-remote.tgz" 2>/dev/null; then
  tar -xzf "$tmp/cc-remote.tgz" -C "$tmp"
  src="$tmp/cc-remote"
else
  prebuilt=0
  fetch "https://codeload.github.com/$REPO/tar.gz/refs/heads/master" "$tmp/source.tgz"
  mkdir -p "$tmp/source"
  tar -xzf "$tmp/source.tgz" -C "$tmp/source" --strip-components=1
  src="$tmp/source"
fi

if [ -f "$APP_DIR/bin/cc-remote.js" ]; then
  "$NODE" "$APP_DIR/bin/cc-remote.js" stop >/dev/null 2>&1 || true
fi

say "Installing..."
mkdir -p "$DATA_DIR"
rm -rf "$APP_DIR.new"
mv "$src" "$APP_DIR.new"
(cd "$APP_DIR.new" && npm ci --omit=dev --no-audit --no-fund --no-update-notifier --loglevel=error >/dev/null)
if [ "$prebuilt" = 0 ]; then
  say "Building the web app..."
  (cd "$APP_DIR.new/app" && npm ci --no-audit --no-fund --no-update-notifier --loglevel=error >/dev/null && npm run build >/dev/null && rm -rf node_modules)
fi
rm -rf "$APP_DIR"
mv "$APP_DIR.new" "$APP_DIR"

mkdir -p "$BIN_DIR"
cat >"$BIN_DIR/cc-remote" <<EOF
#!/bin/sh
exec "$NODE" "$APP_DIR/bin/cc-remote.js" "\$@"
EOF
chmod +x "$BIN_DIR/cc-remote"

case ":$PATH:" in
  *":$BIN_DIR:"*) on_path=1 ;;
  *) on_path=0 ;;
esac
if [ "$on_path" = 0 ]; then
  line='export PATH="$HOME/.local/bin:$PATH"'
  for rc in "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.profile"; do
    if [ -f "$rc" ] && ! grep -qs '.local/bin' "$rc"; then
      printf '\n%s\n' "$line" >>"$rc"
    fi
  done
  if [ ! -f "$HOME/.zshrc" ] && [ ! -f "$HOME/.bashrc" ] && [ ! -f "$HOME/.profile" ]; then
    printf '%s\n' "$line" >"$HOME/.profile"
  fi
fi

say ""
if [ "${CC_REMOTE_UPDATE:-}" = 1 ]; then
  "$BIN_DIR/cc-remote" setup --yes
elif (: </dev/tty) 2>/dev/null; then
  "$BIN_DIR/cc-remote" setup "$@" </dev/tty
else
  "$BIN_DIR/cc-remote" setup --yes "$@"
fi

if [ "$on_path" = 0 ]; then
  say ""
  say "Open a new terminal to use the cc-remote command."
fi
