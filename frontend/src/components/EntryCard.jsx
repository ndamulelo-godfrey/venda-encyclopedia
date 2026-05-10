import { Link } from "react-router-dom";
import { CATEGORY_COLORS, CATEGORY_LABELS } from "../lib/api";

export default function EntryCard({ entry, index = 0 }) {
  const color = CATEGORY_COLORS[entry.category] || "#2B2927";
  return (
    <Link
      to={`/entry/${entry.id}`}
      className="group flex flex-col p-7 lg:p-8 bg-white border rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-lg evenda-fade-up"
      style={{
        borderColor: "var(--evenda-border)",
        animationDelay: `${index * 60}ms`,
      }}
      data-testid={`entry-card-${entry.id}`}
    >
      <div className="flex items-center justify-between mb-5">
        <span
          className="inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase font-semibold"
          style={{
            backgroundColor: `${color}1A`,
            color: color,
          }}
          data-testid={`entry-card-category-${entry.id}`}
        >
          {CATEGORY_LABELS[entry.category] || entry.category}
        </span>
        {entry.region ? (
          <span
            className="text-[11px] tracking-wide truncate ml-3"
            style={{ color: "var(--evenda-muted)" }}
          >
            {entry.region}
          </span>
        ) : null}
      </div>

      <h3
        className="font-serif-display text-3xl lg:text-4xl leading-tight mb-2 group-hover:text-[var(--evenda-primary)] transition-colors"
        data-testid={`entry-card-term-${entry.id}`}
      >
        {entry.term}
      </h3>
      <p
        className="text-sm mb-4"
        style={{ color: "var(--evenda-text-2)" }}
        data-testid={`entry-card-translation-${entry.id}`}
      >
        {entry.translation}
      </p>
      <p
        className="text-sm leading-relaxed line-clamp-3"
        style={{ color: "var(--evenda-text-2)" }}
      >
        {entry.meaning}
      </p>
      <div
        className="mt-6 pt-5 border-t flex items-center justify-between"
        style={{ borderColor: "var(--evenda-border)" }}
      >
        <span className="text-xs" style={{ color: "var(--evenda-muted)" }}>
          {entry.pronunciation ? (
            <span className="font-mono-pron">/{entry.pronunciation}/</span>
          ) : (
            <span className="italic">No pronunciation</span>
          )}
        </span>
        <span
          className="text-xs uppercase tracking-[0.2em]"
          style={{ color: color }}
        >
          Read →
        </span>
      </div>
    </Link>
  );
}
