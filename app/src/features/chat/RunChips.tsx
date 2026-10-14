import { useState } from "react";
import { Popup } from "antd-mobile";
import { EFFORTS, MODELS, MODES, effortOf, modeOf, modelOf } from "./catalog";
import { until } from "../../lib/format";
import { useUsage } from "../../api/hooks";
import { writeRunOption } from "../../lib/storage";
import type { Effort, PermissionMode } from "../../api/types";

function Bars({ level }: { level: number }) {
  return (
    <span className="bars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((step) => (
        <i key={step} className={step <= level ? "is-on" : ""} />
      ))}
    </span>
  );
}

interface Props {
  model: string;
  mode: PermissionMode;
  effort: Effort;
  onChange: (next: { model: string; mode: PermissionMode; effort: Effort }) => void;
}

export function RunChips({ model, mode, effort, onChange }: Props) {
  const [sheet, setSheet] = useState<"model" | "mode" | "effort" | "usage" | null>(null);
  const usage = useUsage();
  const window5 = usage.data?.fiveHour;
  const percent = window5 ? Math.max(0, Math.min(100, Math.round(window5.utilization))) : null;

  return (
    <>
      <button className="chip" onClick={() => setSheet("model")} aria-haspopup="dialog">
        <span className={`chip-spark model-${modelOf(model).id || "default"}`} aria-hidden="true" />
        {modelOf(model).short}
      </button>

      <button className="chip" onClick={() => setSheet("mode")} aria-haspopup="dialog">
        <span className={`chip-dot mode-${mode}`} aria-hidden="true" />
        {modeOf(mode).label}
      </button>

      <button className="chip" onClick={() => setSheet("effort")} aria-haspopup="dialog">
        <Bars level={effortOf(effort).level} />
        {effortOf(effort).short}
      </button>

      {usage.data && !usage.data.error ? (
        <button
          className={`chip${percent !== null && percent >= 85 ? " is-hot" : percent !== null && percent >= 60 ? " is-warm" : ""}`}
          onClick={() => setSheet("usage")}
          aria-haspopup="dialog"
          aria-label="Plan usage"
        >
          {usage.data.available && percent !== null ? (
            <>
              <span className="meter" aria-hidden="true">
                <i style={{ width: `${percent}%` }} />
              </span>
              <span className="num">{percent}%</span>
            </>
          ) : (
            <span>no limit</span>
          )}
        </button>
      ) : null}

      <Popup visible={sheet === "model"} onMaskClick={() => setSheet(null)} bodyClassName="sheet">
        <div className="sheet-inner">
          <h2 className="sheet-title">Model</h2>
          {MODELS.map((entry) => (
            <button
              key={entry.id || "default"}
              className={`pick${entry.id === (model || "") ? " is-on" : ""}`}
              onClick={() => {
                writeRunOption("model", entry.id);
                onChange({ model: entry.id, mode, effort });
                setSheet(null);
              }}
            >
              <span className={`chip-spark model-${entry.id || "default"}`} aria-hidden="true" />
              <span className="pick-text">
                <b>{entry.label}</b>
                <em>{entry.hint}</em>
              </span>
            </button>
          ))}
          <p className="sheet-note">Applies to the next run you start.</p>
        </div>
      </Popup>

      <Popup visible={sheet === "mode"} onMaskClick={() => setSheet(null)} bodyClassName="sheet">
        <div className="sheet-inner">
          <h2 className="sheet-title">Permission mode</h2>
          {MODES.map((entry) => (
            <button
              key={entry.id}
              className={`pick${entry.id === mode ? " is-on" : ""}`}
              onClick={() => {
                writeRunOption("permission", entry.id);
                onChange({ model, mode: entry.id, effort });
                setSheet(null);
              }}
            >
              <span className={`chip-dot mode-${entry.id}`} aria-hidden="true" />
              <span className="pick-text">
                <b>{entry.label}</b>
                <em>{entry.hint}</em>
              </span>
            </button>
          ))}
        </div>
      </Popup>

      <Popup visible={sheet === "usage"} onMaskClick={() => setSheet(null)} bodyClassName="sheet">
        <div className="sheet-inner">
          <h2 className="sheet-title">Plan usage</h2>
          {usage.data?.available ? (
            <>
              {(usage.data.limits ?? []).map((limit) => {
                const value = Math.max(0, Math.min(100, Math.round(limit.utilization)));
                const resets = until(limit.resetsAt);
                return (
                  <div key={limit.key} className={`usage-row${limit.isActive ? " is-active" : ""}`}>
                    <div className="usage-head">
                      <span className="usage-label">
                        {limit.label}
                        {limit.isActive ? <span className="usage-now">in use</span> : null}
                      </span>
                      <span className="usage-value num">{value}%</span>
                    </div>
                    <span className={`usage-bar${value >= 85 ? " is-hot" : value >= 60 ? " is-warm" : ""}`}>
                      <i style={{ width: `${value}%` }} />
                    </span>
                    {resets ? <span className="usage-reset">resets in {resets}</span> : null}
                  </div>
                );
              })}
              {usage.data.plan ? <p className="usage-plan">Plan: {usage.data.plan}</p> : null}
            </>
          ) : (
            <p className="usage-plan">Plan limits do not apply to this account.</p>
          )}
          <button className="usage-refresh" onClick={() => usage.refetch()} disabled={usage.isFetching}>
            {usage.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </Popup>

      <Popup visible={sheet === "effort"} onMaskClick={() => setSheet(null)} bodyClassName="sheet">
        <div className="sheet-inner">
          <h2 className="sheet-title">Reasoning effort</h2>
          {EFFORTS.map((entry) => (
            <button
              key={entry.id || "default"}
              className={`pick${entry.id === effort ? " is-on" : ""}`}
              onClick={() => {
                writeRunOption("effort", entry.id);
                onChange({ model, mode, effort: entry.id });
                setSheet(null);
              }}
            >
              <Bars level={entry.level} />
              <span className="pick-text">
                <b>{entry.label}</b>
                <em>{entry.hint}</em>
              </span>
            </button>
          ))}
        </div>
      </Popup>
    </>
  );
}
