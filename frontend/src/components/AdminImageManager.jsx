import { useState, useRef } from "react";
import { Upload, Link2, Trash2, Loader2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

/**
 * Admin-only image manager for an entry.
 * Visible only when the logged-in user has role === "admin".
 */
export default function AdminImageManager({ entry, onUpdated }) {
  const { t } = useI18n();
  const [mode, setMode] = useState("upload"); // upload | url
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileRef = useRef(null);

  const reset = () => {
    setError("");
    setSuccess("");
  };

  const persistUrl = async (image_url) => {
    const { data } = await api.patch(`/entries/${entry.id}/image`, { image_url });
    onUpdated?.(data);
    setSuccess(t("saved"));
  };

  const onUploadFile = async (e) => {
    e.preventDefault();
    reset();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Please choose a file first.");
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/admin/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await persistUrl(data.url);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSaveUrl = async (e) => {
    e.preventDefault();
    reset();
    if (!url.trim()) {
      setError("Paste an image URL first.");
      return;
    }
    setBusy(true);
    try {
      await persistUrl(url.trim());
      setUrl("");
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async () => {
    reset();
    if (!window.confirm(t("confirm_remove_image"))) return;
    setBusy(true);
    try {
      const { data } = await api.delete(`/entries/${entry.id}/image`);
      onUpdated?.(data);
      setSuccess(t("saved"));
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const hasImage = !!entry.image_url;

  return (
    <section
      className="mt-12 mb-12 p-6 sm:p-8 rounded-2xl border-2 border-dashed"
      style={{ borderColor: "var(--evenda-primary)" }}
      data-testid="admin-image-manager"
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <p
            className="text-[11px] tracking-[0.3em] uppercase"
            style={{ color: "var(--evenda-primary)" }}
          >
            {t("admin_panel")} · {hasImage ? t("replace_image") : t("manage_image")}
          </p>
          <h3 className="font-serif-display text-2xl mt-1">
            {hasImage ? t("replace_image") : t("upload_image")}
          </h3>
        </div>
        {hasImage ? (
          <button
            onClick={onRemove}
            disabled={busy}
            className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] px-4 py-2 rounded-full border transition-colors disabled:opacity-60"
            style={{ borderColor: "var(--evenda-border)", color: "var(--evenda-text-2)" }}
            data-testid="admin-image-remove"
          >
            <Trash2 className="w-3.5 h-3.5" /> {t("remove_image")}
          </button>
        ) : null}
      </div>

      <div
        className="inline-flex p-1 rounded-full border mb-6"
        style={{ borderColor: "var(--evenda-border)", backgroundColor: "var(--evenda-bg)" }}
      >
        <button
          onClick={() => setMode("upload")}
          className="px-4 py-2 text-xs uppercase tracking-[0.18em] rounded-full transition-all flex items-center gap-2"
          style={{
            backgroundColor: mode === "upload" ? "var(--evenda-text)" : "transparent",
            color: mode === "upload" ? "#fff" : "var(--evenda-text-2)",
          }}
          data-testid="admin-image-mode-upload"
        >
          <Upload className="w-3.5 h-3.5" /> {t("upload_image")}
        </button>
        <button
          onClick={() => setMode("url")}
          className="px-4 py-2 text-xs uppercase tracking-[0.18em] rounded-full transition-all flex items-center gap-2"
          style={{
            backgroundColor: mode === "url" ? "var(--evenda-text)" : "transparent",
            color: mode === "url" ? "#fff" : "var(--evenda-text-2)",
          }}
          data-testid="admin-image-mode-url"
        >
          <Link2 className="w-3.5 h-3.5" /> {t("paste_url")}
        </button>
      </div>

      {mode === "upload" ? (
        <form onSubmit={onUploadFile} className="space-y-4" data-testid="admin-image-upload-form">
          <p className="text-sm" style={{ color: "var(--evenda-text-2)" }}>
            {t("upload_a_file")}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="block text-sm w-full file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-[var(--evenda-bg-2)] file:text-[var(--evenda-text)] hover:file:bg-[var(--evenda-bg-3)] cursor-pointer"
            data-testid="admin-image-file"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: "var(--evenda-primary)" }}
            data-testid="admin-image-upload-submit"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {busy ? t("uploading") : t("save_image")}
          </button>
        </form>
      ) : (
        <form onSubmit={onSaveUrl} className="space-y-4" data-testid="admin-image-url-form">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("image_url_placeholder")}
            className="w-full h-12 px-4 rounded-lg border bg-white outline-none focus:border-[var(--evenda-primary)]"
            style={{ borderColor: "var(--evenda-border)" }}
            data-testid="admin-image-url-input"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white text-sm font-medium disabled:opacity-60"
            style={{ backgroundColor: "var(--evenda-primary)" }}
            data-testid="admin-image-url-submit"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {busy ? t("saving") : t("save_image")}
          </button>
        </form>
      )}

      {error ? (
        <p className="mt-4 text-sm text-red-600" data-testid="admin-image-error">
          {error}
        </p>
      ) : null}
      {success ? (
        <p
          className="mt-4 text-sm"
          style={{ color: "var(--evenda-accent)" }}
          data-testid="admin-image-success"
        >
          ✓ {success}
        </p>
      ) : null}
    </section>
  );
}
