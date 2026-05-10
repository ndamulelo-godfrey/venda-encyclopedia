import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Trash2, Search, ShieldAlert, Image as ImageIcon } from "lucide-react";
import Header from "../components/Header";
import EntryEditDialog from "../components/EntryEditDialog";
import { api, CATEGORY_COLORS, CATEGORIES, categoryLabelKey, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useI18n } from "../i18n/I18nContext";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const isAdmin = user && user !== false && user.role === "admin";

  useEffect(() => {
    if (user === false) navigate("/login");
  }, [user, navigate]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/entries", { params: { sort: "newest", limit: 1000 } });
      setEntries(data);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  const filtered = useMemo(() => {
    let list = entries;
    if (category !== "all") list = list.filter((e) => e.category === category);
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.term.toLowerCase().includes(needle) ||
          e.translation.toLowerCase().includes(needle) ||
          (e.contributor_name || "").toLowerCase().includes(needle)
      );
    }
    return list;
  }, [entries, q, category]);

  const onSaved = (updated) => {
    setEntries((list) => list.map((e) => (e.id === updated.id ? updated : e)));
  };

  const onDeleteConfirm = async () => {
    if (!deleting) return;
    try {
      await api.delete(`/entries/${deleting.id}`);
      setEntries((list) => list.filter((e) => e.id !== deleting.id));
      setDeleting(null);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    }
  };

  if (user === null) {
    return (
      <div className="min-h-screen">
        <Header />
        <p className="max-w-7xl mx-auto px-4 py-16 text-sm" style={{ color: "var(--evenda-muted)" }}>
          {t("checking_session")}
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center" data-testid="admin-denied">
          <ShieldAlert className="w-10 h-10 mx-auto mb-4" style={{ color: "var(--evenda-primary)" }} />
          <h1 className="font-serif-display text-3xl mb-2">{t("admin_only")}</h1>
          <p className="text-sm" style={{ color: "var(--evenda-text-2)" }}>
            {t("admin_only_body")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen evenda-grain" data-testid="admin-dashboard">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-24">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
          <div>
            <p className="text-[11px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--evenda-primary)" }}>
              {t("admin_panel")}
            </p>
            <h1 className="font-serif-display text-4xl sm:text-5xl font-light tracking-tight" data-testid="admin-heading">
              {t("admin_dashboard")}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--evenda-text-2)" }}>
              {t("admin_intro", `${entries.length} entries · edit, delete, manage all`)}
            </p>
          </div>
          <button
            onClick={() => navigate("/contribute")}
            className="px-5 py-3 rounded-full text-white text-sm font-medium self-start"
            style={{ backgroundColor: "var(--evenda-primary)" }}
            data-testid="admin-new-entry"
          >
            {t("admin_new_entry")}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div
            className="relative flex-1 flex items-center bg-white rounded-full border"
            style={{ borderColor: "var(--evenda-border)" }}
          >
            <Search className="absolute left-4 w-4 h-4" style={{ color: "var(--evenda-muted)" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("admin_search_placeholder")}
              className="w-full h-11 pl-11 pr-4 text-sm bg-transparent outline-none rounded-full"
              data-testid="admin-search"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-11 px-4 rounded-full border bg-white text-sm"
            style={{ borderColor: "var(--evenda-border)" }}
            data-testid="admin-category-select"
          >
            <option value="all">{t("category_all")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(categoryLabelKey(c))}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: "var(--evenda-muted)" }}>{t("loading_entries")}</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div
            className="bg-white rounded-2xl border overflow-hidden"
            style={{ borderColor: "var(--evenda-border)" }}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="admin-table">
                <thead>
                  <tr
                    className="text-[10px] uppercase tracking-[0.18em] border-b"
                    style={{ color: "var(--evenda-muted)", borderColor: "var(--evenda-border)" }}
                  >
                    <th className="text-left px-5 py-4">{t("col_term")}</th>
                    <th className="text-left px-5 py-4">{t("col_translation")}</th>
                    <th className="text-left px-5 py-4">{t("col_category")}</th>
                    <th className="text-left px-5 py-4 hidden md:table-cell">{t("col_contributor")}</th>
                    <th className="text-left px-5 py-4 hidden lg:table-cell">{t("col_created")}</th>
                    <th className="text-right px-5 py-4">{t("col_actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center" style={{ color: "var(--evenda-muted)" }}>
                        {t("nothing_found")}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((e) => (
                      <tr
                        key={e.id}
                        className="border-b hover:bg-[var(--evenda-bg)]"
                        style={{ borderColor: "var(--evenda-border)" }}
                        data-testid={`admin-row-${e.id}`}
                      >
                        <td className="px-5 py-4">
                          <Link
                            to={`/entry/${e.id}`}
                            className="font-serif-display text-lg hover:text-[var(--evenda-primary)] transition-colors flex items-center gap-2"
                          >
                            {e.image_url ? <ImageIcon className="w-3.5 h-3.5" style={{ color: "var(--evenda-muted)" }} /> : null}
                            {e.term}
                          </Link>
                        </td>
                        <td className="px-5 py-4 max-w-[260px] truncate" style={{ color: "var(--evenda-text-2)" }}>
                          {e.translation}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] tracking-[0.18em] uppercase font-semibold"
                            style={{
                              backgroundColor: `${CATEGORY_COLORS[e.category] || "#888"}1A`,
                              color: CATEGORY_COLORS[e.category] || "#555",
                            }}
                          >
                            {t(categoryLabelKey(e.category))}
                          </span>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell" style={{ color: "var(--evenda-text-2)" }}>
                          {e.contributor_name || "—"}
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell text-xs" style={{ color: "var(--evenda-muted)" }}>
                          {new Date(e.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => setEditing(e)}
                              className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border"
                              style={{ borderColor: "var(--evenda-border)" }}
                              data-testid={`admin-edit-${e.id}`}
                            >
                              <Pencil className="w-3 h-3" /> {t("edit")}
                            </button>
                            <button
                              onClick={() => setDeleting(e)}
                              className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.15em] px-3 py-1.5 rounded-full border text-red-600"
                              style={{ borderColor: "rgba(220,38,38,0.3)" }}
                              data-testid={`admin-delete-${e.id}`}
                            >
                              <Trash2 className="w-3 h-3" /> {t("delete")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <EntryEditDialog
        entry={editing}
        onClose={() => setEditing(null)}
        onSaved={onSaved}
      />

      {deleting ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleting(null)}
          data-testid="admin-delete-modal"
        >
          <div
            className="bg-white rounded-2xl p-7 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif-display text-2xl mb-2">{t("confirm_delete_title")}</h3>
            <p className="text-sm mb-6" style={{ color: "var(--evenda-text-2)" }}>
              {t("confirm_delete_body").replace("{term}", deleting.term)}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="px-5 py-2.5 rounded-full text-sm border"
                style={{ borderColor: "var(--evenda-border)" }}
                data-testid="admin-delete-cancel"
              >
                {t("cancel")}
              </button>
              <button
                onClick={onDeleteConfirm}
                className="px-5 py-2.5 rounded-full text-sm text-white bg-red-600"
                data-testid="admin-delete-confirm"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
