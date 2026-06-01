export type ViewKey = "ledger" | "table" | "timeline";

const TABS: { key: ViewKey; label: string; code: string }[] = [
  { key: "ledger", label: "The Ledger", code: "01" },
  { key: "table", label: "Every Notice", code: "02" },
  { key: "timeline", label: "Timeline", code: "03" },
];

/** Full-width sticky tab bar that sits directly under the dateline. */
export function ViewTabs({ value, onChange }: { value: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <div className="tabs">
      <div className="row">
        {TABS.map((t) => {
          const active = t.key === value;
          return (
            <button
              type="button"
              key={t.key}
              onClick={() => onChange(t.key)}
              aria-current={active ? "page" : undefined}
              className={`tab${active ? " on" : ""}`}
            >
              <span className="code">{t.code}</span>
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
