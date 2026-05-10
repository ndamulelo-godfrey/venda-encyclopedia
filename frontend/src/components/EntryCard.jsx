import { Link } from "react-router-dom";
import { useState } from "react";
import { CATEGORY_COLORS, categoryLabelKey } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

export default function EntryCard({ entry, index = 0 }) {
  const { t } = useI18n();
  const [imgFailed, setImgFailed] = useState(false);
  const color = CATEGORY_COLORS[entry.category] || "#2B2927";
  const hasImage = !!entry.image_url && !imgFailed;

  return (
    <Link
      to={`/entry/${entry.id}`}
      className="group flex flex-col bg-white border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg evenda-fade-up"
      style={{
        borderColor: "var(--evenda-border)",
        animationDelay: `${index * 60}ms`,
      }}
      data-testid={`entry-card-${entry.id}`}
    >
      {hasImage ? (
        <div
          className="relative w-full aspect-[16/10] overflow-hidden"
          style={{ backgroundColor: "var(--evenda-bg-2)" }}
        >
          <img
            src={entry.image_url}
            alt={entry.term}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            data-testid={`entry-card-image-${entry.id}`}
          />
          <span
            className="absolute top-3 left-3 inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase font-semibold"
            style={{
              backgroundColor: "rgba(253, 251, 247, 0.92)",
              color: color,
            }}
            data-testid={`entry-card-category-${entry.id}`}
          >
            {t(categoryLabelKey(entry.category))}
          </span>
        </div>
      ) : null}

      <div className="flex flex-col p-7 lg:p-8 flex-1">
        {!hasImage ? (
          <div className="flex items-center justify-between mb-5">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase font-semibold"
              style={{
                backgroundColor: `${color}1A`,
                color: color,
              }}
              data-testid={`entry-card-category-${entry.id}`}
            >
              {t(categoryLabelKey(entry.category))}
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
        ) : entry.region ? (
          <p
            className="text-[11px] tracking-wide uppercase mb-3"
            style={{ color: "var(--evenda-muted)" }}
          >
            {entry.region}
          </p>
        ) : null}

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
              <span className="italic">{t("no_pronunciation")}</span>
            )}
          </span>
          <span
            className="text-xs uppercase tracking-[0.2em]"
            style={{ color: color }}
          >
            {t("read")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
