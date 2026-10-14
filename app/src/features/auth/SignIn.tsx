import { useState } from "react";
import { Button, Input } from "antd-mobile";
import { Capacitor } from "@capacitor/core";
import { readServer, writeServer, writeToken } from "../../lib/storage";
import "./signin.css";

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const native = Capacitor.isNativePlatform();
  const [server, setServer] = useState(() => readServer());
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken) return;
    setBusy(true);
    setError(null);
    writeServer(server.trim());
    writeToken(trimmedToken);
    try {
      const { api } = await import("../../api/client");
      await api.get("/health");
      onSignedIn();
    } catch (cause) {
      writeToken(null);
      setError((cause as Error).message || "Could not reach that server");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="signin">
      <div className="signin-card">
        <h1>Remote for Claude Code</h1>
        <p className="signin-lead">Connect to the server running on your machine.</p>

        {native || server ? (
          <label className="signin-field">
            <span>Server address</span>
            <Input
              placeholder="192.168.1.10:61777"
              value={server}
              onChange={setServer}
              clearable
            />
          </label>
        ) : null}

        <label className="signin-field">
          <span>Access token</span>
          <Input
            type="password"
            placeholder="Paste token"
            value={token}
            onChange={setToken}
            onEnterPress={submit}
          />
        </label>

        {error ? <p className="signin-error">{error}</p> : null}

        <Button block color="primary" loading={busy} onClick={submit} disabled={!token.trim()}>
          Connect
        </Button>

        {!native && !server ? (
          <button className="signin-alt" onClick={() => setServer(window.location.host)}>
            Connect to a different machine
          </button>
        ) : null}

        <p className="signin-hint">
          Run <code>cc-remote pair</code> on that machine to see the address and token.
        </p>
      </div>
    </div>
  );
}
