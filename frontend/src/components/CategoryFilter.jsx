import { CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from "../lib/api";

export default function CategoryFilter({ value, onChange }) {
  const all = ["all", ...CATEGORIES];
  return (
    <div className="flex flex-wrap gap-2" data-testid="category-filter">
      {all.map((c) => {
        const active = value === c;
        const color = c === "all" ? "#2B2927" : CATEGORY_COLORS[c];
        const label = c === "all" ? "All" : CATEGORY_LABELS[c];
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            data-testid={`category-filter-${c}`}
            className="text-xs uppercase tracking-[0.18em] px-4 py-2 rounded-full border transition-all"
            style={{
              borderColor: active ? color : "var(--evenda-border)",
              backgroundColor: active ? color : "transparent",
              color: active ? "#fff" : "var(--evenda-text-2)",
              fontWeight: active ? 600 : 500,
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
