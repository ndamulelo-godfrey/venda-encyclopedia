import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { Button } from "./ui/button";
import { LogOut, PenSquare, User as UserIcon, Languages } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
  const { t, lang, toggle } = useI18n();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-xl border-b"
      style={{
        backgroundColor: "rgba(253, 251, 247, 0.85)",
        borderColor: "var(--evenda-border)",
      }}
      data-testid="site-header"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="logo-link">
          <span
            className="font-serif-display text-2xl sm:text-3xl"
            style={{ color: "var(--evenda-text)" }}
          >
            Evenda
          </span>
          <span
            className="hidden sm:inline text-[11px] tracking-[0.25em] uppercase"
            style={{ color: "var(--evenda-muted)" }}
          >
            {t("site_subtitle")}
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggle}
            title={t("language")}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] px-3 py-2 rounded-full border transition-colors"
            style={{
              borderColor: "var(--evenda-border)",
              color: "var(--evenda-text-2)",
            }}
            data-testid="lang-toggle"
          >
            <Languages className="w-3.5 h-3.5" />
            {lang === "vh" ? "VEN" : "EN"}
          </button>

          <Link
            to="/search"
            className="hidden sm:inline-flex text-sm px-3 py-2 rounded-full transition-colors hover:bg-[var(--evenda-bg-2)]"
            data-testid="nav-browse"
          >
            {t("browse")}
          </Link>
          {user && user !== false ? (
            <>
              {user.role === "admin" ? (
                <Link
                  to="/admin"
                  className="hidden md:inline-flex text-sm px-3 py-2 rounded-full transition-colors hover:bg-[var(--evenda-bg-2)]"
                  data-testid="nav-admin"
                >
                  {t("admin_dashboard")}
                </Link>
              ) : null}
              <Button
                onClick={() => navigate("/contribute")}
                className="rounded-full text-white"
                style={{ backgroundColor: "var(--evenda-primary)" }}
                data-testid="nav-contribute"
              >
                <PenSquare className="w-4 h-4 mr-2" /> {t("contribute")}
              </Button>
              <span
                className="hidden md:inline-flex items-center gap-2 text-sm px-3 py-2 rounded-full"
                style={{ backgroundColor: "var(--evenda-bg-2)" }}
                data-testid="nav-user-name"
              >
                <UserIcon className="w-4 h-4" />
                {user.name}
                {user.role === "admin" ? (
                  <span
                    className="ml-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-[0.18em]"
                    style={{ backgroundColor: "var(--evenda-primary)", color: "#fff" }}
                  >
                    Admin
                  </span>
                ) : null}
              </span>
              <Button
                variant="ghost"
                onClick={onLogout}
                className="rounded-full"
                data-testid="nav-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm px-3 py-2 rounded-full transition-colors hover:bg-[var(--evenda-bg-2)]"
                data-testid="nav-login"
              >
                {t("sign_in")}
              </Link>
              <Link
                to="/register"
                className="text-sm px-4 py-2 rounded-full text-white transition-colors"
                style={{ backgroundColor: "var(--evenda-accent)" }}
                data-testid="nav-register"
              >
                {t("join")}
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
