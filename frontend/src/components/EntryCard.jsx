import { Link } from "react-router-dom";
import { useState } from "react";
import {
  CATEGORY_COLORS,
  IMAGE_CATEGORIES,
  categoryLabelKey,
  localizedField,
} from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

/**
 * EntryCard
 *  - Plants & Animals with an image  → horizontal layout (text left, image right).
 *  - Everything else (or any entry without an image) → vertical text-only layout.
 *  - Meaning displayed in the active UI language (Tshivenda / English) when
 *    a translation is available.
 */
export default function EntryCard({ entry, index = 0 }) {
  const { t, lang } = useI18n();
  const [imgFailed, setImgFailed] = useState(false);
  const color = CATEGORY_COLORS[entry.category] || "#2B2927";

  const supportsImage = IMAGE_CATEGORIES.has(entry.category);
  const showImage = supportsImage && !!entry.image_url && !imgFailed;
  const meaning = localizedField(entry, "meaning", lang);

  if (showImage) {
    // Horizontal card — image on the right (or stacked on mobile).
    return (
      <Link
        to={`/entry/${entry.id}`}
        className="group flex flex-col sm:flex-row bg-white border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg evenda-fade-up md:col-span-2 lg:col-span-3"
        style={{
          borderColor: "var(--evenda-border)",
          animationDelay: `${index * 60}ms`,
        }}
        data-testid={`entry-card-${entry.id}`}
      >
        <div className="flex-1 flex flex-col p-7 lg:p-10 order-2 sm:order-1">
          <div className="flex items-center gap-3 mb-5">
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase font-semibold"
              style={{ backgroundColor: `${color}1A`, color }}
              data-testid={`entry-card-category-${entry.id}`}
            >
              {t(categoryLabelKey(entry.category))}
            </span>
            {entry.region ? (
              <span
                className="text-[11px] tracking-wide truncate"
                style={{ color: "var(--evenda-muted)" }}
              >
                {entry.region}
              </span>
            ) : null}
          </div>
          <h3
            className="font-serif-display text-3xl lg:text-5xl leading-[1.05] mb-3 group-hover:text-[var(--evenda-primary)] transition-colors"
            data-testid={`entry-card-term-${entry.id}`}
          >
            {entry.term}
          </h3>
          <p
            className="text-sm sm:text-base mb-4 italic"
            style={{ color: "var(--evenda-text-2)" }}
            data-testid={`entry-card-translation-${entry.id}`}
          >
            {entry.translation}
          </p>
          <p
            className="text-sm sm:text-base leading-relaxed line-clamp-4 max-w-xl"
            style={{ color: "var(--evenda-text-2)" }}
          >
            {meaning}
          </p>
          <div
            className="mt-auto pt-6 flex items-center justify-between"
            style={{ color: "var(--evenda-muted)" }}
          >
            <span className="text-xs">
              {entry.pronunciation ? (
                <span className="font-mono-pron">/{entry.pronunciation}/</span>
              ) : (
                <span className="italic">{t("no_pronunciation")}</span>
              )}
            </span>
            <span className="text-xs uppercase tracking-[0.2em]" style={{ color }}>
              {t("read")} →
            </span>
          </div>
        </div>
        <div
          className="relative w-full sm:w-[42%] aspect-[16/10] sm:aspect-auto sm:min-h-[260px] order-1 sm:order-2 overflow-hidden"
          style={{ backgroundColor: "var(--evenda-bg-2)" }}
        >
          <img
            src={entry.image_url}
            alt={entry.term}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            data-testid={`entry-card-image-${entry.id}`}
          />
        </div>
      </Link>
    );
  }

  // Default vertical text-only card
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
      <div className="flex flex-col p-7 lg:p-8 flex-1">
        <div className="flex items-center justify-between mb-5">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase font-semibold"
            style={{ backgroundColor: `${color}1A`, color }}
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
          {meaning}
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
            style={{ color }}
          >
            {t("read")} →
          </span>
        </div>
      </div>
    </Link>
  );
}
