import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Volume2, Pencil, Trash2 } from "lucide-react";
import Header from "../components/Header";
import AdminImageManager from "../components/AdminImageManager";
import EntryEditDialog from "../components/EntryEditDialog";
import { api, CATEGORY_COLORS, IMAGE_CATEGORIES, categoryLabelKey, localizedField, formatApiError } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";
import { useAuth } from "../context/AuthContext";

export default function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    api
      .get(`/entries/${id}`)
      .then((res) => mounted && setEntry(res.data))
      .catch(() => mounted && setError(t("entry_not_found")))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id, t]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <p
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-sm"
          style={{ color: "var(--evenda-muted)" }}
          data-testid="entry-loading"
        >
          {t("loading_entries")}
        </p>
      </div>
    );
  }
  if (error || !entry) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" data-testid="entry-not-found">
          <h1 className="font-serif-display text-4xl">{t("entry_not_found")}</h1>
          <p className="mt-3 text-sm" style={{ color: "var(--evenda-text-2)" }}>
            {t("entry_not_found_body")}
          </p>
          <button
            onClick={() => navigate("/search")}
            className="mt-6 px-5 py-3 rounded-full text-white text-sm"
            style={{ backgroundColor: "var(--evenda-primary)" }}
            data-testid="back-to-browse"
          >
            ← {t("back_to_browse")}
          </button>
        </div>
      </div>
    );
  }

  const color = CATEGORY_COLORS[entry.category] || "#2B2927";
  const isAdmin = user && user !== false && user.role === "admin";
  const supportsImage = IMAGE_CATEGORIES.has(entry.category);
  const showImage = supportsImage && !!entry.image_url;
  const meaning = localizedField(entry, "meaning", lang);
  const example = localizedField(entry, "example", lang);

  const playPronunciation = () => {
    if (entry.audio_url) {
      const audio = new Audio(entry.audio_url);
      audio.play().catch(() => {});
      return;
    }
    if ("speechSynthesis" in window) {
      const u = new SpeechSynthesisUtterance(entry.term);
      u.rate = 0.85;
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="min-h-screen evenda-grain" data-testid="entry-page">
      <Header />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        <div className="flex items-start justify-between gap-4 mb-10">
          <Link
            to="/search"
            className="inline-flex items-center text-xs uppercase tracking-[0.22em]"
            style={{ color: "var(--evenda-muted)" }}
            data-testid="entry-back-link"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("back_to_browse")}
          </Link>

          {isAdmin ? (
            <div className="flex items-center gap-2" data-testid="entry-admin-toolbar">
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] px-4 py-2 rounded-full border transition-colors hover:bg-[var(--evenda-bg-2)]"
                style={{ borderColor: "var(--evenda-border)", color: "var(--evenda-text-2)" }}
                data-testid="entry-edit-button"
              >
                <Pencil className="w-3.5 h-3.5" /> {t("edit")}
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] px-4 py-2 rounded-full border text-red-600 transition-colors hover:bg-red-50"
                style={{ borderColor: "rgba(220,38,38,0.3)" }}
                data-testid="entry-delete-button"
              >
                <Trash2 className="w-3.5 h-3.5" /> {t("delete")}
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase font-semibold"
            style={{ backgroundColor: `${color}1A`, color }}
            data-testid="entry-category-badge"
          >
            {t(categoryLabelKey(entry.category))}
          </span>
        </div>

        <h1
          className="font-serif-display text-5xl sm:text-6xl lg:text-7xl font-medium tracking-tight leading-[1.02] mb-4"
          data-testid="entry-term"
        >
          {entry.term}
        </h1>
        <p
          className="font-serif-display text-2xl sm:text-3xl font-light italic mb-6"
          style={{ color: "var(--evenda-text-2)" }}
          data-testid="entry-translation"
        >
          {entry.translation}
        </p>

        {entry.pronunciation ? (
          <div className="flex items-center gap-3 mb-12" data-testid="entry-pronunciation-row">
            <button
              onClick={playPronunciation}
              className="flex items-center justify-center w-11 h-11 rounded-full transition-colors"
              style={{
                backgroundColor: "var(--evenda-bg-2)",
                color: "var(--evenda-primary)",
              }}
              aria-label={t("play_pronunciation")}
              data-testid="entry-play-pronunciation"
            >
              <Volume2 className="w-5 h-5" />
            </button>
            <span
              className="font-mono-pron text-base sm:text-lg"
              style={{ color: "var(--evenda-text-2)" }}
              data-testid="entry-pronunciation"
            >
              /{entry.pronunciation}/
            </span>
          </div>
        ) : null}

        {showImage ? (
          <img
            src={entry.image_url}
            alt={entry.term}
            className="w-full aspect-[16/9] object-cover rounded-2xl mb-12 border"
            style={{ borderColor: "var(--evenda-border)" }}
            data-testid="entry-image"
          />
        ) : null}

        <section className="mb-10">
          <h2
            className="text-[11px] tracking-[0.3em] uppercase mb-4"
            style={{ color: "var(--evenda-muted)" }}
          >
            {t("meaning")}
          </h2>
          <p
            className="font-serif-display text-xl sm:text-2xl leading-relaxed font-light"
            style={{ color: "var(--evenda-text)" }}
            data-testid="entry-meaning"
          >
            {meaning}
          </p>
        </section>

        {example ? (
          <section
            className="mb-10 p-6 sm:p-8 rounded-2xl border-l-4"
            style={{
              backgroundColor: "var(--evenda-bg-2)",
              borderColor: color,
            }}
            data-testid="entry-example-block"
          >
            <p
              className="text-[11px] tracking-[0.3em] uppercase mb-3"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("in_use")}
            </p>
            <p
              className="font-serif-display text-lg sm:text-xl italic leading-relaxed"
              style={{ color: "var(--evenda-text)" }}
              data-testid="entry-example"
            >
              &ldquo;{example}&rdquo;
            </p>
          </section>
        ) : null}

        {isAdmin && supportsImage ? (
          <AdminImageManager entry={entry} onUpdated={(e) => setEntry(e)} />
        ) : null}

        <EntryEditDialog
          entry={editing ? entry : null}
          onClose={() => setEditing(false)}
          onSaved={(updated) => setEntry(updated)}
        />

        {confirmDelete ? (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => !deleting && setConfirmDelete(false)}
            data-testid="entry-delete-modal"
          >
            <div
              className="bg-white rounded-2xl p-7 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-serif-display text-2xl mb-2">{t("confirm_delete_title")}</h3>
              <p className="text-sm mb-6" style={{ color: "var(--evenda-text-2)" }}>
                {t("confirm_delete_body").replace("{term}", entry.term)}
              </p>
              {deleteError ? (
                <p className="text-sm text-red-600 mb-4" data-testid="entry-delete-error">
                  {deleteError}
                </p>
              ) : null}
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-full text-sm border disabled:opacity-60"
                  style={{ borderColor: "var(--evenda-border)" }}
                  data-testid="entry-delete-cancel"
                >
                  {t("cancel")}
                </button>
                <button
                  onClick={async () => {
                    setDeleting(true);
                    setDeleteError("");
                    try {
                      await api.delete(`/entries/${entry.id}`);
                      navigate("/search");
                    } catch (err) {
                      setDeleteError(formatApiError(err.response?.data?.detail) || err.message);
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  className="px-5 py-2.5 rounded-full text-sm text-white bg-red-600 disabled:opacity-60"
                  data-testid="entry-delete-confirm"
                >
                  {deleting ? t("saving") : t("delete")}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <footer
          className="mt-14 pt-6 border-t flex items-center justify-between text-xs"
          style={{
            borderColor: "var(--evenda-border)",
            color: "var(--evenda-muted)",
          }}
          data-testid="entry-footer"
        >
          <span>
            {t("contributed_by")}{" "}
            <span style={{ color: "var(--evenda-text-2)" }}>
              {entry.contributor_name || "Evenda"}
            </span>
          </span>
          <span>{new Date(entry.created_at).toLocaleDateString()}</span>
        </footer>
      </article>
    </div>
  );
}
