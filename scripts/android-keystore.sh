#!/bin/sh
set -eu

out="${1:-cc-remote-release.keystore}"
if [ -e "$out" ]; then
  echo "$out already exists" >&2
  exit 1
fi

keytool=""
for candidate in "${JAVA_HOME:+$JAVA_HOME/bin/keytool}" keytool /opt/homebrew/opt/openjdk@21/bin/keytool /opt/homebrew/opt/openjdk/bin/keytool /usr/local/opt/openjdk/bin/keytool; do
  [ -n "$candidate" ] || continue
  if "$candidate" -help >/dev/null 2>&1; then
    keytool=$candidate
    break
  fi
done
if [ -z "$keytool" ]; then
  echo "keytool was not found. Install Java first (macOS: brew install openjdk@21), then run this again." >&2
  exit 1
fi

password=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32)
if ! log=$("$keytool" -genkeypair -keystore "$out" -storepass "$password" -keypass "$password" \
  -alias cc-remote -keyalg RSA -keysize 4096 -validity 10000 -dname "CN=Remote for Claude Code" 2>&1); then
  echo "$log" >&2
  exit 1
fi
chmod 600 "$out"

echo "Saved $out. Keep it and the password safe: every update must be signed with it."
echo
echo "Add these as GitHub repository secrets (Settings > Secrets and variables > Actions):"
echo
echo "ANDROID_KEYSTORE_PASSWORD = $password"
echo "ANDROID_KEY_ALIAS         = cc-remote"
echo "ANDROID_KEYSTORE_BASE64   = (the line below)"
base64 <"$out" | tr -d '\n'
echo
