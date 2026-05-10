import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");
    const res = await register(name, email, password);
    setLoading(false);
    if (res.ok) navigate("/");
    else setError(res.error);
  };

  return (
    <div className="min-h-screen evenda-grain" data-testid="register-page">
      <Header />
      <div className="max-w-md mx-auto px-4 sm:px-6 pt-16 pb-24">
        <p
          className="text-[11px] tracking-[0.3em] uppercase mb-3"
          style={{ color: "var(--evenda-muted)" }}
        >
          Join the keepers
        </p>
        <h1 className="font-serif-display text-4xl sm:text-5xl font-light tracking-tight mb-8" data-testid="register-heading">
          Create your Evenda account
        </h1>

        <form onSubmit={submit} className="space-y-5" data-testid="register-form">
          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              Display name
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)]"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="register-name"
            />
          </label>
          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              Email
            </span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)]"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="register-email"
            />
          </label>
          <label className="block">
            <span
              className="block text-[11px] tracking-[0.22em] uppercase mb-2"
              style={{ color: "var(--evenda-muted)" }}
            >
              Password
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)]"
              style={{ borderColor: "var(--evenda-border)" }}
              data-testid="register-password"
            />
          </label>

          {error ? (
            <p className="text-sm text-red-600" data-testid="register-error">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full text-white font-medium disabled:opacity-60"
            style={{ backgroundColor: "var(--evenda-primary)" }}
            data-testid="register-submit"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p
            className="text-sm text-center pt-3"
            style={{ color: "var(--evenda-text-2)" }}
          >
            Already have an account?{" "}
            <Link
              to="/login"
              className="underline"
              style={{ color: "var(--evenda-primary)" }}
              data-testid="register-go-login"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
