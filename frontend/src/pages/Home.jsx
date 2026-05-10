import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Header from "../components/Header";
import { CATEGORY_LABELS } from "../lib/api";

const HERO_IMG =
  "https://images.pexels.com/photos/36139778/pexels-photo-36139778.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=900&w=1600";

export default function Home() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <div className="min-h-screen flex flex-col" data-testid="home-page">
      <Header />

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-cover"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(43,41,39,0.25) 0%, rgba(43,41,39,0.55) 50%, rgba(43,41,39,0.75) 100%)",
          }}
          aria-hidden
        />

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 py-24 sm:py-32 text-center">
          <p
            className="text-[11px] sm:text-xs tracking-[0.4em] uppercase mb-6 evenda-fade-up"
            style={{ color: "rgba(253,251,247,0.85)" }}
            data-testid="hero-tagline"
          >
            A Living Encyclopedia of Tshivenda
          </p>
          <h1
            className="font-serif-display text-white text-5xl sm:text-6xl lg:text-7xl font-light leading-[1.05] tracking-tight evenda-fade-up"
            style={{ animationDelay: "60ms" }}
            data-testid="hero-title"
          >
            Welcome to <span style={{ color: "#F1B074" }}>Evenda</span>
          </h1>
          <p
            className="mt-6 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed evenda-fade-up"
            style={{ color: "rgba(253,251,247,0.85)", animationDelay: "120ms" }}
            data-testid="hero-subtitle"
          >
            Search words, proverbs, idioms, plants, animals, places, and the
            living folklore of the Vhavenda people — preserved by the community,
            for the world.
          </p>

          <form
            onSubmit={submit}
            className="mt-10 sm:mt-14 max-w-3xl mx-auto evenda-fade-up"
            style={{ animationDelay: "180ms" }}
            data-testid="hero-search-form"
          >
            <div className="relative flex items-center bg-white rounded-full shadow-2xl overflow-hidden border border-white/30">
              <Search
                className="absolute left-6 w-5 h-5"
                style={{ color: "var(--evenda-muted)" }}
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a word, proverb or animal — e.g. 'Ndaa' or 'baobab'"
                className="w-full h-16 sm:h-20 pl-16 pr-36 text-base sm:text-lg outline-none bg-transparent"
                style={{ color: "var(--evenda-text)" }}
                data-testid="hero-search-input"
              />
              <button
                type="submit"
                className="absolute right-2 h-12 sm:h-14 px-6 sm:px-8 rounded-full text-white font-medium tracking-wide transition-colors"
                style={{ backgroundColor: "var(--evenda-primary)" }}
                data-testid="hero-search-submit"
              >
                Search
              </button>
            </div>
          </form>

          <div
            className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-3 text-xs uppercase tracking-[0.22em] evenda-fade-up"
            style={{ color: "rgba(253,251,247,0.8)", animationDelay: "240ms" }}
            data-testid="hero-categories"
          >
            {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
              <button
                key={k}
                onClick={() => navigate(`/search?category=${k}`)}
                className="hover:text-white transition-colors"
                data-testid={`hero-category-${k}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <footer
        className="border-t py-6 text-center text-xs"
        style={{
          borderColor: "var(--evenda-border)",
          color: "var(--evenda-muted)",
        }}
        data-testid="site-footer"
      >
        © {new Date().getFullYear()} Evenda — Preserving Tshivenda heritage,
        one entry at a time.
      </footer>
    </div>
  );
}
