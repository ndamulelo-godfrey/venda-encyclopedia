import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";

export default function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      const next = location.state?.from || "/";
      navigate(next);
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="min-h-screen evenda-grain" data-testid="login-page">
      <Header />
      <div className="max-w-md mx-auto px-4 sm:px-6 pt-16 pb-24">
        <p className="text-[11px] tracking-[0.3em] uppercase mb-3" style={{ color: "var(--evenda-muted)" }}>
          {t("welcome_back")}
        </p>
        <h1 className="font-serif-display text-4xl sm:text-5xl font-light tracking-tight mb-8" data-testid="login-heading">
          {t("sign_in_to_evenda")}
        </h1>

        <form onSubmit={submit} className="space-y-5" data-testid="login-form">
          <label className="block">
            <span className="block text-[11px] tracking-[0.22em] uppercase mb-2" style={{ color: "var(--evenda-muted)" }}>
              {t("email")}
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)]"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="login-email"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] tracking-[0.22em] uppercase mb-2" style={{ color: "var(--evenda-muted)" }}>
              {t("password")}
            </span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)]"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="login-password"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" data-testid="login-error">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full text-white font-medium disabled:opacity-60"
            style={{ backgroundColor: "var(--evenda-primary)" }}
            data-testid="login-submit"
          >
            {loading ? t("signing_in") : t("sign_in")}
          </button>

          <p className="text-sm text-center pt-3" style={{ color: "var(--evenda-text-2)" }}>
            {t("new_to_evenda")}{" "}
            <Link to="/register" className="underline" style={{ color: "var(--evenda-primary)" }} data-testid="login-go-register">
              {t("create_an_account")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
