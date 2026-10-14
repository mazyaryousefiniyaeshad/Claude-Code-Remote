import { useState } from "react";
import { Screen } from "../../components/Screen";
import {
  readEnterMode,
  readFontScale,
  readServer,
  readTheme,
  writeEnterMode,
  writeFontScale,
  writeServer,
  writeTheme,
  writeToken,
  type EnterMode,
} from "../../lib/storage";
import { Capacitor } from "@capacitor/core";
import "./settings.css";

const ANDROID_APP_URL = "https://github.com/mazyaryousefiniyaeshad/Claude-Code-Remote/releases/latest/download/cc-remote.apk";

export function SettingsScreen() {
  const [theme, setTheme] = useState(() => readTheme() ?? document.documentElement.dataset.theme ?? "dark");
  const [scale, setScale] = useState(() => readFontScale());
  const [enter, setEnter] = useState<EnterMode>(() => readEnterMode());
  const [server, setServer] = useState(() => readServer());

  const applyTheme = (next: string) => {
    document.documentElement.dataset.theme = next;
    writeTheme(next);
    setTheme(next);
  };

  const applyScale = (delta: number) => {
    const next = Math.min(20, Math.max(12, scale + delta));
    document.documentElement.style.setProperty("--t-body", `${next}px`);
    writeFontScale(next);
    setScale(next);
  };

  return (
    <Screen title="Settings" back>
      <div className="settings">
        <section className="field">
          <h2>Appearance</h2>
          <div className="segmented" role="group" aria-label="Theme">
            <button aria-pressed={theme === "light"} onClick={() => applyTheme("light")}>
              Light
            </button>
            <button aria-pressed={theme === "dark"} onClick={() => applyTheme("dark")}>
              Dark
            </button>
          </div>
        </section>

        <section className="field">
          <h2>Text size</h2>
          <div className="stepper">
            <button aria-label="Smaller text" onClick={() => applyScale(-1)}>
              A−
            </button>
            <span className="stepper-value num" aria-live="polite">
              {scale} px
            </span>
            <button aria-label="Larger text" onClick={() => applyScale(1)}>
              A+
            </button>
          </div>
        </section>

        <section className="field">
          <h2>Enter key</h2>
          <div className="segmented" role="group" aria-label="Enter key behaviour">
            {(["auto", "newline", "send"] as EnterMode[]).map((mode) => (
              <button
                key={mode}
                aria-pressed={enter === mode}
                onClick={() => {
                  writeEnterMode(mode);
                  setEnter(mode);
                }}
              >
                {mode === "auto" ? "Auto" : mode === "newline" ? "New line" : "Send"}
              </button>
            ))}
          </div>
          <p className="field-hint">
            Auto sends on Enter with a physical keyboard and adds a new line on touch screens.
            Cmd or Ctrl with Enter always sends.
          </p>
        </section>

        <section className="field">
          <h2>Server</h2>
          <input
            className="field-input"
            value={server}
            placeholder="192.168.1.10:61777"
            onChange={(event) => setServer(event.target.value)}
            onBlur={() => writeServer(server.trim())}
            aria-label="Server address"
          />
          <p className="field-hint">Leave empty when the app is served by the server itself.</p>
        </section>

        {Capacitor.isNativePlatform() ? null : (
          <section className="field">
            <h2>Android app</h2>
            <a className="field-link" href={ANDROID_APP_URL} target="_blank" rel="noreferrer">
              Download the app
            </a>
            <p className="field-hint">Open it, then paste the link from <code>cc-remote pair</code>.</p>
          </section>
        )}

        <section className="field">
          <h2>Session</h2>
          <button
            className="danger"
            onClick={() => {
              writeToken(null);
              window.location.href = "/";
            }}
          >
            Sign out
          </button>
        </section>
      </div>
    </Screen>
  );
}
