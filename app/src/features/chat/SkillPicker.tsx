import { useMemo, useState } from "react";
import { Popup, SearchBar } from "antd-mobile";
import { useSkills } from "../../api/hooks";
import type { Skill, SkillSource } from "../../api/types";
import "./skills.css";

const GROUP_LABEL: Record<SkillSource, string> = {
  project: "This project",
  personal: "Yours",
  plugin: "Plugins",
};

const GROUP_ORDER: SkillSource[] = ["project", "personal", "plugin"];
const HEAVY_THRESHOLD = 2;

interface Props {
  cwd: string;
  selected: string[];
  onChange: (next: string[]) => void;
}

export function SkillPicker({ cwd, selected, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const query = useSkills(open ? cwd : null);

  const all = useMemo(() => query.data?.skills ?? [], [query.data]);
  const tags = query.data?.tags ?? [];

  const visible = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return all.filter((skill) => {
      if (tag && !skill.tags.includes(tag)) return false;
      if (!needle) return true;
      return (
        skill.id.toLowerCase().includes(needle) || skill.description.toLowerCase().includes(needle)
      );
    });
  }, [all, term, tag]);

  const groups = useMemo(() => {
    const bucket = new Map<SkillSource, Skill[]>();
    for (const skill of visible) {
      const list = bucket.get(skill.source) ?? [];
      list.push(skill);
      bucket.set(skill.source, list);
    }
    return GROUP_ORDER.map((source) => ({ source, items: bucket.get(source) ?? [] })).filter(
      (group) => group.items.length > 0,
    );
  }, [visible]);

  const toggle = (id: string) =>
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);

  const addMany = (ids: string[]) => onChange([...new Set([...selected, ...ids])]);
  const removeMany = (ids: string[]) => onChange(selected.filter((id) => !ids.includes(id)));

  const visibleIds = visible.map((skill) => skill.id);
  const allVisibleOn = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  return (
    <>
      <button
        className={`chip${selected.length ? " is-active" : ""}`}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Choose skills"
      >
        <svg className="chip-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l2.4 5.6 6 .5-4.6 4 1.4 5.9-5.2-3.2-5.2 3.2 1.4-5.9-4.6-4 6-.5z" />
        </svg>
        {selected.length ? `${selected.length} skill${selected.length === 1 ? "" : "s"}` : "Skills"}
      </button>

      <Popup visible={open} onMaskClick={() => setOpen(false)} bodyClassName="sheet sheet-tall">
        <div className="skill-sheet">
          <header className="skill-head">
            <h2 className="sheet-title">Skills</h2>
            <span className="skill-count num">{selected.length} picked</span>
            <button className="skill-done" onClick={() => setOpen(false)}>
              Done
            </button>
          </header>

          <div className="skill-controls">
            <SearchBar placeholder="Search skills" value={term} onChange={setTerm} className="skill-search" />

            <div className="skill-tags">
              <button
                className={`tag-chip${tag === null ? " is-on" : ""}`}
                onClick={() => setTag(null)}
                aria-pressed={tag === null}
              >
                All <span className="num">{all.length}</span>
              </button>
              {tags.map((entry) => (
                <button
                  key={entry.tag}
                  className={`tag-chip${tag === entry.tag ? " is-on" : ""}`}
                  onClick={() => setTag(tag === entry.tag ? null : entry.tag)}
                  aria-pressed={tag === entry.tag}
                >
                  {entry.tag} <span className="num">{entry.count}</span>
                </button>
              ))}
            </div>

            <div className="skill-bulk">
              <button
                disabled={visibleIds.length === 0}
                onClick={() => (allVisibleOn ? removeMany(visibleIds) : addMany(visibleIds))}
              >
                {allVisibleOn ? "Deselect" : "Select"} all shown ({visibleIds.length})
              </button>
              {selected.length ? <button onClick={() => onChange([])}>Clear</button> : null}
            </div>

            {selected.length > HEAVY_THRESHOLD ? (
              <p className="skill-warn">
                {selected.length} skills get prepended to your message. Each adds instructions and uses
                more of your plan.
              </p>
            ) : null}
          </div>

          <div className="skill-list scroll">
            {query.isLoading ? <p className="skill-note">Loading…</p> : null}
            {query.error ? <p className="skill-note">{(query.error as Error).message}</p> : null}
            {!query.isLoading && groups.length === 0 ? <p className="skill-note">No matches.</p> : null}

            {groups.map((group) => {
              const ids = group.items.map((skill) => skill.id);
              const groupOn = ids.every((id) => selected.includes(id));
              return (
                <section key={group.source} className="skill-group">
                  <div className="skill-group-head">
                    <p className="skill-group-label">{GROUP_LABEL[group.source]}</p>
                    <button
                      className="skill-group-all"
                      onClick={() => (groupOn ? removeMany(ids) : addMany(ids))}
                    >
                      {groupOn ? "none" : "all"}
                    </button>
                  </div>
                  {group.items.map((skill) => {
                    const on = selected.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        className={`skill-row${on ? " is-on" : ""}`}
                        aria-pressed={on}
                        onClick={() => toggle(skill.id)}
                      >
                        <span className="skill-box" aria-hidden="true" />
                        <span className="skill-text">
                          <b>{skill.name}</b>
                          <em>{skill.description}</em>
                        </span>
                      </button>
                    );
                  })}
                </section>
              );
            })}
          </div>
        </div>
      </Popup>
    </>
  );
}
