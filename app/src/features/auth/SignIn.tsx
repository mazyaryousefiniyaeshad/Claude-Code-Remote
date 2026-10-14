import { useState } from "react";
import { Button, Input } from "antd-mobile";
import { Capacitor } from "@capacitor/core";
import { readServer, writeServer, writeToken } from "../../lib/storage";
import { parsePairing } from "../../lib/pairing";
import { api } from "../../api/client";
import "./signin.css";

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const native = Capacitor.isNativePlatform();
  const [server, setServer] = useState(() => readServer());
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const connect = async (nextServer: string, nextToken: string) => {
    const trimmedToken = nextToken.trim();
    if (!trimmedToken) return;
    setBusy(true);
    setError(null);
    writeServer(nextServer.trim());
    writeToken(trimmedToken);
    try {
      await api.get("/health");
      onSignedIn();
    } catch (cause) {
      writeToken(null);
      setError((cause as Error).message || "Could not reach that server");
    } finally {
      setBusy(false);
    }
  };

  const take = (value: string, apply: (value: string) => void) => {
    const pairing = parsePairing(value);
    if (!pairing) return apply(value);
    const nextServer = native || pairing.server !== window.location.origin ? pairing.server : "";
    setServer(nextServer);
    setToken(pairing.token);
    void connect(nextServer, pairing.token);
  };

  return (
    <div className="signin">
      <div className="signin-card">
        <h1>Remote for Claude Code</h1>
        <p className="signin-lead">Connect to the server running on your machine.</p>

        {native || server ? (
          <label className="signin-field">
            <span>Pairing link or server address</span>
            <Input
              placeholder="http://192.168.1.10:61777/#pair=…"
              value={server}
              onChange={(value) => take(value, setServer)}
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
            onChange={(value) => take(value, setToken)}
            onEnterPress={() => connect(server, token)}
          />
        </label>

        {error ? <p className="signin-error">{error}</p> : null}

        <Button block color="primary" loading={busy} onClick={() => connect(server, token)} disabled={!token.trim()}>
          Connect
        </Button>

        {!native && !server ? (
          <button className="signin-alt" onClick={() => setServer(window.location.host)}>
            Connect to a different machine
          </button>
        ) : null}

        <p className="signin-hint">
          Run <code>cc-remote pair</code> on that machine to see the link, address and token.
        </p>
      </div>
    </div>
  );
}
