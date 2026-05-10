import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Volume2 } from "lucide-react";
import Header from "../components/Header";
import { api, CATEGORY_COLORS, CATEGORY_LABELS } from "../lib/api";

export default function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    api
      .get(`/entries/${id}`)
      .then((res) => mounted && setEntry(res.data))
      .catch(() => mounted && setError("Entry not found."))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <p
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-sm"
          style={{ color: "var(--evenda-muted)" }}
          data-testid="entry-loading"
        >
          Loading entry…
        </p>
      </div>
    );
  }
  if (error || !entry) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20" data-testid="entry-not-found">
          <h1 className="font-serif-display text-4xl">Entry not found</h1>
          <p className="mt-3 text-sm" style={{ color: "var(--evenda-text-2)" }}>
            We couldn't locate that entry. It may have been removed or the link is incorrect.
          </p>
          <button
            onClick={() => navigate("/search")}
            className="mt-6 px-5 py-3 rounded-full text-white text-sm"
            style={{ backgroundColor: "var(--evenda-primary)" }}
            data-testid="back-to-browse"
          >
            ← Back to browse
          </button>
        </div>
      </div>
    );
  }

  const color = CATEGORY_COLORS[entry.category] || "#2B2927";

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
        <Link
          to="/search"
          className="inline-flex items-center text-xs uppercase tracking-[0.22em] mb-10"
          style={{ color: "var(--evenda-muted)" }}
          data-testid="entry-back-link"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to browse
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-[10px] tracking-[0.22em] uppercase font-semibold"
            style={{ backgroundColor: `${color}1A`, color }}
            data-testid="entry-category-badge"
          >
            {CATEGORY_LABELS[entry.category] || entry.category}
          </span>
          {entry.region ? (
            <span
              className="inline-flex items-center text-xs"
              style={{ color: "var(--evenda-muted)" }}
              data-testid="entry-region"
            >
              <MapPin className="w-3.5 h-3.5 mr-1.5" /> {entry.region}
            </span>
          ) : null}
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
              aria-label="Play pronunciation"
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

        {entry.image_url ? (
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
            Meaning
          </h2>
          <p
            className="font-serif-display text-xl sm:text-2xl leading-relaxed font-light"
            style={{ color: "var(--evenda-text)" }}
            data-testid="entry-meaning"
          >
            {entry.meaning}
          </p>
        </section>

        {entry.example ? (
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
              In Use
            </p>
            <p
              className="font-serif-display text-lg sm:text-xl italic leading-relaxed"
              style={{ color: "var(--evenda-text)" }}
              data-testid="entry-example"
            >
              “{entry.example}”
            </p>
          </section>
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
            Contributed by{" "}
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
