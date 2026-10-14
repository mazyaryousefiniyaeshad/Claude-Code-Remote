#!/bin/sh
set -eu

out="${1:-cc-remote-release.keystore}"
[ -e "$out" ] && { echo "$out already exists" >&2; exit 1; }

password=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)
keytool -genkeypair -keystore "$out" -storepass "$password" -keypass "$password" \
  -alias cc-remote -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Remote for Claude Code" >/dev/null 2>&1

echo "Saved $out. Keep it and the password safe: every update must be signed with it."
echo
echo "Add these as GitHub repository secrets (Settings > Secrets and variables > Actions):"
echo
echo "ANDROID_KEYSTORE_PASSWORD = $password"
echo "ANDROID_KEY_ALIAS         = cc-remote"
echo "ANDROID_KEYSTORE_BASE64   = (the line below)"
base64 <"$out" | tr -d '\n'
echo
