export type ViewKey = "ledger" | "table" | "timeline";

const TABS: { key: ViewKey; label: string }[] = [
  { key: "ledger", label: "The Ledger" },
  { key: "table", label: "Every Notice" },
  { key: "timeline", label: "Timeline" },
];

export function ViewTabs({ value, onChange }: { value: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <nav className="reveal flex items-end gap-0 border-b-2 border-ink">
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <button
            type="button"
            key={t.key}
            onClick={() => onChange(t.key)}
            aria-current={active ? "page" : undefined}
            className={`relative -mb-0.5 px-4 py-2.5 font-display text-lg transition-colors sm:text-xl ${
              active ? "text-ink" : "text-ink-faint hover:text-ink-soft"
            }`}
          >
            {t.label}
            {active && <span className="absolute inset-x-0 -bottom-0.5 h-1 bg-brick" />}
          </button>
        );
      })}
    </nav>
  );
}
