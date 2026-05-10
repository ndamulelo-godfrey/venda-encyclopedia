import { CATEGORIES, CATEGORY_COLORS, categoryLabelKey } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

export default function CategoryFilter({ value, onChange }) {
  const { t } = useI18n();
  const all = ["all", ...CATEGORIES];
  return (
    <div className="flex flex-wrap gap-2" data-testid="category-filter">
      {all.map((c) => {
        const active = value === c;
        const color = c === "all" ? "#2B2927" : CATEGORY_COLORS[c];
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
            {t(categoryLabelKey(c))}
          </button>
        );
      })}
    </div>
  );
}
