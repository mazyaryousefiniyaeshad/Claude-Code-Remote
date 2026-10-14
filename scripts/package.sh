#!/bin/sh
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
out="$root/dist"
stage="$out/cc-remote"

rm -rf "$out"
mkdir -p "$stage/app"

(cd "$root/app" && npm ci --no-audit --no-fund --loglevel=error && npm run build >/dev/null)

cp -R "$root/server.js" "$root/lib" "$root/bin" "$root/package.json" "$root/package-lock.json" "$root/LICENSE" "$root/README.md" "$stage/"
cp -R "$root/app/dist" "$stage/app/dist"

COPYFILE_DISABLE=1 tar -czf "$out/cc-remote.tgz" -C "$out" cc-remote
rm -rf "$stage"
echo "$out/cc-remote.tgz"
