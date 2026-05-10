import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { api, formatApiError, CATEGORIES, categoryLabelKey } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

const FIELD_KEYS = [
  ["term", "field_term"],
  ["translation", "field_translation"],
  ["pronunciation", "field_pronunciation"],
  ["region", "field_region"],
  ["audio_url", "field_audio_url"],
];

export default function EntryEditDialog({ entry, onClose, onSaved }) {
  const { t } = useI18n();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!entry) {
      setForm(null);
      return;
    }
    setForm({
      term: entry.term || "",
      translation: entry.translation || "",
      pronunciation: entry.pronunciation || "",
      region: entry.region || "",
      audio_url: entry.audio_url || "",
      image_url: entry.image_url || "",
      category: entry.category || "words",
      meaning: entry.meaning || "",
      example: entry.example || "",
    });
    setError("");
  }, [entry]);

  if (!entry || !form) return null;

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch(`/entries/${entry.id}`, form);
      onSaved?.(data);
      onClose?.();
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      data-testid="edit-dialog-backdrop"
    >
      <div
        className="bg-white rounded-2xl border w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{ borderColor: "var(--evenda-border)" }}
        onClick={(e) => e.stopPropagation()}
        data-testid="edit-dialog"
      >
        <div
          className="sticky top-0 bg-white flex items-center justify-between p-5 border-b"
          style={{ borderColor: "var(--evenda-border)" }}
        >
          <div>
            <p
              className="text-[11px] tracking-[0.3em] uppercase"
              style={{ color: "var(--evenda-primary)" }}
            >
              {t("admin_panel")}
            </p>
            <h2 className="font-serif-display text-2xl mt-1">{t("edit_entry")}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--evenda-bg-2)]"
            data-testid="edit-dialog-close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5" data-testid="edit-dialog-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELD_KEYS.map(([k, lk]) => (
              <label key={k} className="block">
                <span
                  className="block text-[11px] tracking-[0.22em] uppercase mb-2"
                  style={{ color: "var(--evenda-muted)" }}
                >
                  {t(lk)}
                </span>
                <input
                  value={form[k]}
                  onChange={(e) => update(k, e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)]"
                  style={{ borderColor: "var(--evenda-border)" }}
                  data-testid={`edit-input-${k}`}
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("field_category")}
            </span>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full h-11 px-4 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)]"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="edit-input-category"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(categoryLabelKey(c))}</option>
              ))}
            </select>
          </label>

          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("field_meaning")}
            </span>
            <textarea
              rows={4}
              value={form.meaning}
              onChange={(e) => update("meaning", e.target.value)}
              className="w-full p-3 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)] leading-relaxed"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="edit-input-meaning"
            />
          </label>

          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("field_example")}
            </span>
            <textarea
              rows={3}
              value={form.example}
              onChange={(e) => update("example", e.target.value)}
              className="w-full p-3 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)] leading-relaxed"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="edit-input-example"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" data-testid="edit-error">{error}</p>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm border"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="edit-cancel"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: "var(--evenda-primary)" }}
              data-testid="edit-save"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saving ? t("saving") : t("save_changes")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
