export type ViewKey = "ledger" | "table" | "timeline";

const TABS: { key: ViewKey; label: string; code: string }[] = [
  { key: "ledger", label: "The Ledger", code: "01" },
  { key: "table", label: "Every Notice", code: "02" },
  { key: "timeline", label: "Timeline", code: "03" },
];

export function ViewTabs({ value, onChange }: { value: ViewKey; onChange: (v: ViewKey) => void }) {
  return (
    <nav className="reveal flex items-stretch border border-rule">
      {TABS.map((t) => {
        const active = t.key === value;
        return (
          <button
            type="button"
            key={t.key}
            onClick={() => onChange(t.key)}
            aria-current={active ? "page" : undefined}
            className={`group relative flex items-center gap-2 border-l border-rule px-3.5 py-2.5 font-mono text-xs uppercase tracking-[0.14em] transition-colors first:border-l-0 sm:px-5 ${
              active
                ? "bg-amber/10 text-amber"
                : "text-ink-faint hover:bg-paper-raised/60 hover:text-ink-soft"
            }`}
          >
            <span className={active ? "text-amber/70" : "text-rule-strong"}>{t.code}</span>
            {t.label}
            {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-amber" />}
          </button>
        );
      })}
    </nav>
  );
}
