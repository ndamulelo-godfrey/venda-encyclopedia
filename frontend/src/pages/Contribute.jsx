import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError, CATEGORIES, CATEGORY_LABELS } from "../lib/api";

const FIELDS = [
  { key: "term", label: "Tshivenda Term", placeholder: "e.g. Muvhuyu", required: true },
  { key: "translation", label: "English Translation", placeholder: "e.g. Baobab tree", required: true },
  { key: "pronunciation", label: "Pronunciation", placeholder: "e.g. moo-vhoo-yoo" },
  { key: "region", label: "Region / Dialect", placeholder: "e.g. Vhembe" },
  { key: "image_url", label: "Image URL (optional)", placeholder: "https://…" },
  { key: "audio_url", label: "Audio Pronunciation URL (optional)", placeholder: "https://…/word.mp3" },
];

export default function Contribute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    term: "",
    translation: "",
    pronunciation: "",
    region: "",
    image_url: "",
    audio_url: "",
    category: "words",
    meaning: "",
    example: "",
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
          <h1 className="font-serif-display text-4xl mb-3">Sign in to contribute</h1>
          <p className="text-sm mb-8" style={{ color: "var(--evenda-text-2)" }}>
            Evenda is community-built. Create a free account to add words,
            proverbs and stories to the archive.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate("/register")}
              className="px-6 py-3 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: "var(--evenda-primary)" }}
              data-testid="contribute-go-register"
            >
              Create account
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-6 py-3 rounded-full text-sm font-medium border"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-go-login"
            >
              Sign in
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
          Checking your session…
        </p>
      </div>
    );
  }

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
          Add to the Evenda archive
        </p>
        <h1
          className="font-serif-display text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight mb-3"
          data-testid="contribute-heading"
        >
          Contribute an entry
        </h1>
        <p
          className="text-base mb-12 max-w-2xl"
          style={{ color: "var(--evenda-text-2)" }}
        >
          Share a word, proverb, plant, animal or piece of folklore. Fill the
          template below — every contribution helps preserve Tshivenda for the
          generations to come.
        </p>

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
              Category *
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
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              Meaning / Description *
            </span>
            <textarea
              required
              value={form.meaning}
              onChange={(e) => update("meaning", e.target.value)}
              rows={5}
              placeholder="Explain the meaning, cultural context and significance…"
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
              Example in a Sentence (optional)
            </span>
            <textarea
              value={form.example}
              onChange={(e) => update("example", e.target.value)}
              rows={3}
              placeholder="Show how it's used naturally — Tshivenda or English."
              className="w-full p-4 rounded-lg border bg-white text-base outline-none focus:border-[var(--evenda-primary)] leading-relaxed"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-input-example"
            />
          </label>

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
              {submitting ? "Saving…" : "Publish entry"}
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 rounded-full text-sm border"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="contribute-cancel"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
