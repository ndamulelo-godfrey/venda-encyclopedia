import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { LogOut, PenSquare, User as UserIcon } from "lucide-react";

export default function Header() {
  const { user, logout } = useAuth();
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
            Tshivenda Heritage
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/search"
            className="hidden sm:inline-flex text-sm px-3 py-2 rounded-full transition-colors hover:bg-[var(--evenda-bg-2)]"
            data-testid="nav-browse"
          >
            Browse
          </Link>
          {user && user !== false ? (
            <>
              <Button
                onClick={() => navigate("/contribute")}
                className="rounded-full text-white"
                style={{ backgroundColor: "var(--evenda-primary)" }}
                data-testid="nav-contribute"
              >
                <PenSquare className="w-4 h-4 mr-2" /> Contribute
              </Button>
              <span
                className="hidden md:inline-flex items-center gap-2 text-sm px-3 py-2 rounded-full"
                style={{ backgroundColor: "var(--evenda-bg-2)" }}
                data-testid="nav-user-name"
              >
                <UserIcon className="w-4 h-4" />
                {user.name}
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
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm px-4 py-2 rounded-full text-white transition-colors"
                style={{ backgroundColor: "var(--evenda-accent)" }}
                data-testid="nav-register"
              >
                Join
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
