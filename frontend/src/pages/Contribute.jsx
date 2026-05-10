import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import AudioRecorder from "../components/AudioRecorder";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { api, formatApiError, CATEGORIES, categoryLabelKey } from "../lib/api";
import { Info } from "lucide-react";

export default function Contribute() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    term: "",
    translation: "",
    pronunciation: "",
    region: "",
    audio_url: "",
    category: "words",
    meaning: "",
    meaning_vh: "",
    example: "",
    example_vh: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (user === false) {
    return (
      <div className="min-h-screen">
        <Header />
        <div
          className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center"
          data-testid="contribute-auth-gate"
        >
          <h1 className="font-serif-display text-4xl mb-3">
            {t("sign_in_to_contribute")}
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--evenda-text-2)" }}>
            {t("sign_in_to_contribute_body")}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="px-6 py-3 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: "var(--evenda-primary)" }}
              data-testid="contribute-go-register"
            >
              {t("create_account")}
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 rounded-full text-sm font-medium border"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-go-login"
            >
              {t("sign_in")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="min-h-screen">
        <Header />
        <p
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-sm"
          style={{ color: "var(--evenda-muted)" }}
        >
          {t("checking_session")}
        </p>
      </div>
    );
  }

  const FIELDS = [
    { key: "term", label: t("field_term"), placeholder: "Muvhuyu", required: true },
    { key: "translation", label: t("field_translation"), placeholder: "Baobab tree", required: true },
    { key: "pronunciation", label: t("field_pronunciation"), placeholder: "moo-vhoo-yoo" },
    { key: "region", label: t("field_region"), placeholder: "Vhembe" },
  ];

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/entries", form);
      navigate(`/entry/${data.id}`);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen evenda-grain" data-testid="contribute-page">
      <Header />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">
        <p
          className="text-[11px] tracking-[0.3em] uppercase mb-3"
          style={{ color: "var(--evenda-muted)" }}
        >
          {t("add_to_archive")}
        </p>
        <h1
          className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight mb-3"
          data-testid="contribute-heading"
        >
          {t("contribute_an_entry_title")}
        </h1>
        <p className="text-base mb-10 max-w-2xl" style={{ color: "var(--evenda-text-2)" }}>
          {t("contribute_intro")}
        </p>

        <div
          className="flex items-start gap-3 p-4 rounded-xl mb-10 text-sm"
          style={{ backgroundColor: "var(--evenda-bg-2)", color: "var(--evenda-text-2)" }}
          data-testid="contribute-image-note"
        >
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "var(--evenda-primary)" }} />
          <span>{t("image_admin_only_note")}</span>
        </div>

        <form onSubmit={submit} className="space-y-7" data-testid="contribute-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span
                  className="block text-[11px] tracking-[0.22em] uppercase mb-2"
                  style={{ color: "var(--evenda-muted)" }}
                >
                  {f.label} {f.required ? "*" : ""}
                </span>
                <input
                  required={f.required}
                  value={form[f.key]}
                  onChange={(e) => update(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-12 px-4 rounded-lg border bg-white text-base outline-none focus:border-[var(--evenda-primary)] transition-colors"
                  style={{ borderColor: "var(--evenda-border)" }}
                  data-testid={`contribute-input-${f.key}`}
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("field_category")} *
            </span>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full h-12 px-4 rounded-lg border bg-white text-base outline-none focus:border-[var(--evenda-primary)]"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-input-category"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(categoryLabelKey(c))}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("field_meaning_vh")} *
            </span>
            <textarea
              required
              value={form.meaning_vh}
              onChange={(e) => update("meaning_vh", e.target.value)}
              rows={5}
              className="w-full p-4 rounded-lg border bg-white text-base outline-none focus:border-[var(--evenda-primary)] leading-relaxed"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-input-meaning-vh"
            />
          </label>

          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("field_meaning")} *
            </span>
            <textarea
              required
              value={form.meaning}
              onChange={(e) => update("meaning", e.target.value)}
              rows={5}
              className="w-full p-4 rounded-lg border bg-white text-base outline-none focus:border-[var(--evenda-primary)] leading-relaxed"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-input-meaning"
            />
          </label>

          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("field_example_vh")}
            </span>
            <textarea
              value={form.example_vh}
              onChange={(e) => update("example_vh", e.target.value)}
              rows={3}
              className="w-full p-4 rounded-lg border bg-white text-base outline-none focus:border-[var(--evenda-primary)] leading-relaxed"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-input-example-vh"
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
              value={form.example}
              onChange={(e) => update("example", e.target.value)}
              rows={3}
              className="w-full p-4 rounded-lg border bg-white text-base outline-none focus:border-[var(--evenda-primary)] leading-relaxed"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-input-example"
            />
          </label>

          <div>
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-3"
              style={{ color: "var(--evenda-muted)" }}
            >
              {t("field_pronunciation")} · {t("audio_record")}
            </span>
            <AudioRecorder
              value={form.audio_url}
              onUploaded={(url) => update("audio_url", url)}
            />
          </div>

          {error ? (
            <p className="text-sm text-red-600" data-testid="contribute-error">
              {error}
            </p>
          ) : null}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-7 py-3 rounded-full text-white text-sm font-medium disabled:opacity-60"
              style={{ backgroundColor: "var(--evenda-primary)" }}
              data-testid="contribute-submit"
            >
              {submitting ? t("saving") : t("publish_entry")}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-full text-sm border"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-cancel"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
