import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Search as SearchIcon } from "lucide-react";
import Header from "../components/Header";
import CategoryFilter from "../components/CategoryFilter";
import EntryCard from "../components/EntryCard";
import { api, categoryLabelKey } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

export default function SearchPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const initialQ = params.get("q") || "";
  const initialCat = params.get("category") || "all";
  const initialSort = params.get("sort") || "alpha";

  const [q, setQ] = useState(initialQ);
  const [submittedQ, setSubmittedQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCat);
  const [sort, setSort] = useState(initialSort);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const SORT_OPTIONS = [
    { value: "alpha", label: t("sort_alpha") },
    { value: "newest", label: t("sort_newest") },
    { value: "category", label: t("sort_category") },
  ];

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");
    const queryParams = {};
    if (submittedQ) queryParams.q = submittedQ;
    if (category && category !== "all") queryParams.category = category;
    if (sort) queryParams.sort = sort;

    api
      .get("/entries", { params: queryParams })
      .then((res) => {
        if (mounted) setEntries(res.data);
      })
      .catch(() => {
        if (mounted) setError(t("couldnt_load"));
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [submittedQ, category, sort, t]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (submittedQ) next.set("q", submittedQ);
    if (category && category !== "all") next.set("category", category);
    if (sort && sort !== "alpha") next.set("sort", sort);
    setParams(next, { replace: true });
  }, [submittedQ, category, sort, setParams]);

  const submit = (e) => {
    e.preventDefault();
    setSubmittedQ(q.trim());
  };

  const heading = useMemo(() => {
    if (submittedQ) return `${t("results_for")} "${submittedQ}"`;
    if (category !== "all") return `${t("browse")}: ${t(categoryLabelKey(category))}`;
    return t("browse_the_encyclopedia");
  }, [submittedQ, category, t]);

  return (
    <div className="min-h-screen evenda-grain" data-testid="search-page">
      <Header />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        <p
          className="text-[11px] tracking-[0.3em] uppercase mb-3"
          style={{ color: "var(--evenda-muted)" }}
        >
          {t("the_evenda_index")}
        </p>
        <h1
          className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight"
          data-testid="search-heading"
        >
          {heading}
        </h1>

        <form onSubmit={submit} className="mt-8 max-w-3xl" data-testid="search-form">
          <div
            className="relative flex items-center bg-white rounded-full border-2 transition-all"
            style={{ borderColor: "var(--evenda-border)" }}
          >
            <SearchIcon
              className="absolute left-5 w-5 h-5"
              style={{ color: "var(--evenda-muted)" }}
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search_placeholder_short")}
              className="w-full h-14 pl-14 pr-32 text-base outline-none rounded-full bg-transparent"
              data-testid="search-input"
            />
            <button
              type="submit"
              className="absolute right-1.5 h-11 px-6 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: "var(--evenda-primary)" }}
              data-testid="search-submit"
            >
              {t("search_button")}
            </button>
          </div>
        </form>

        <div className="mt-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <CategoryFilter value={category} onChange={setCategory} />

          <div className="flex items-center gap-3" data-testid="sort-controls">
            <span
              className="text-[11px] tracking-[0.22em] uppercase"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("sort")}
            </span>
            <div
              className="flex rounded-full border overflow-hidden bg-white"
              style={{ borderColor: "var(--evenda-border)" }}
            >
              {SORT_OPTIONS.map((opt) => {
                const active = sort === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSort(opt.value)}
                    type="button"
                    className="px-4 py-2 text-xs uppercase tracking-wider transition-colors"
                    style={{
                      backgroundColor: active ? "var(--evenda-text)" : "transparent",
                      color: active ? "#fff" : "var(--evenda-text-2)",
                      fontWeight: active ? 600 : 500,
                    }}
                    data-testid={`sort-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <p className="text-sm" style={{ color: "var(--evenda-muted)" }} data-testid="search-loading">
            {t("loading_entries")}
          </p>
        ) : error ? (
          <p className="text-sm text-red-600" data-testid="search-error">
            {error}
          </p>
        ) : entries.length === 0 ? (
          <div
            className="border-2 border-dashed rounded-2xl p-12 text-center"
            style={{ borderColor: "var(--evenda-border)" }}
            data-testid="search-empty"
          >
            <h3 className="font-serif-display text-3xl mb-2">{t("nothing_found")}</h3>
            <p className="text-sm mb-6" style={{ color: "var(--evenda-text-2)" }}>
              {t("nothing_found_body")}
            </p>
            <button
              onClick={() => navigate("/contribute")}
              className="px-6 py-3 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: "var(--evenda-primary)" }}
              data-testid="search-empty-contribute"
            >
              {t("contribute_an_entry")}
            </button>
          </div>
        ) : (
          <>
            <p
              className="text-xs uppercase tracking-[0.22em] mb-6"
              style={{ color: "var(--evenda-muted)" }}
              data-testid="search-count"
            >
              {entries.length} {entries.length === 1 ? t("entry_singular") : t("entry_plural")}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {entries.map((e, i) => (
                <EntryCard key={e.id} entry={e} index={i} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
