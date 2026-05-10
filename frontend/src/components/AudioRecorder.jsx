import { useEffect, useRef, useState } from "react";
import { Mic, Square, Play, Pause, Trash2, Upload as UploadIcon, Loader2, CheckCircle2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { useI18n } from "../i18n/I18nContext";

/**
 * AudioRecorder
 * - Browser recording via MediaRecorder API (preferred webm/opus).
 * - File picker fallback (mp3/wav/webm/m4a/ogg).
 * - On save, uploads to /api/upload-audio and calls onUploaded(url).
 */
export default function AudioRecorder({ value = "", onUploaded }) {
  const { t } = useI18n();
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewBlob, setPreviewBlob] = useState(null);
  const [previewName, setPreviewName] = useState("");
  const [playing, setPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = !!(navigator.mediaDevices && window.MediaRecorder);
    setSupported(ok);
  }, []);

  useEffect(() => {
    let id;
    if (recording) {
      const start = Date.now();
      id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 250);
    } else {
      setElapsed(0);
    }
    return () => clearInterval(id);
  }, [recording]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const mr = new MediaRecorder(stream, { mimeType: mime });
      mediaRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blobType = (mediaRef.current?.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(chunksRef.current, { type: blobType });
        const url = URL.createObjectURL(blob);
        setPreviewBlob(blob);
        setPreviewUrl(url);
        const ext = blobType.split("/")[1] || "webm";
        setPreviewName(`recording-${Date.now()}.${ext}`);
      };
      mr.start();
      setRecording(true);
    } catch (e) {
      setError(t("audio_mic_denied"));
    }
  };

  const stopRecording = () => {
    mediaRef.current?.stop();
    setRecording(false);
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.pause();
    else a.play();
  };

  const onPickFile = (e) => {
    setError("");
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^audio\//.test(f.type)) {
      setError(t("audio_pick_audio"));
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError(t("audio_too_large"));
      return;
    }
    const url = URL.createObjectURL(f);
    setPreviewBlob(f);
    setPreviewUrl(url);
    setPreviewName(f.name);
  };

  const discard = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewBlob(null);
    setPreviewUrl("");
    setPreviewName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const upload = async () => {
    if (!previewBlob) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      // Preserve extension by passing filename
      fd.append("file", previewBlob, previewName || "audio.webm");
      const { data } = await api.post("/upload-audio", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onUploaded?.(data.url);
      discard();
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setUploading(false);
    }
  };

  const fmtTime = (s) => {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  };

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ borderColor: "var(--evenda-border)", backgroundColor: "var(--evenda-bg-2)" }}
      data-testid="audio-recorder"
    >
      <div className="flex flex-wrap items-center gap-3">
        {!recording ? (
          <button
            type="button"
            onClick={startRecording}
            disabled={!supported}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: "var(--evenda-primary)" }}
            data-testid="audio-record-start"
          >
            <Mic className="w-4 h-4" /> {t("audio_record")}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-medium animate-pulse"
            style={{ backgroundColor: "#B0383C" }}
            data-testid="audio-record-stop"
          >
            <Square className="w-4 h-4" /> {t("audio_stop")} · {fmtTime(elapsed)}
          </button>
        )}

        <span className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--evenda-muted)" }}>
          {t("or")}
        </span>

        <label className="cursor-pointer">
          <span
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm border"
            style={{ borderColor: "var(--evenda-border)", color: "var(--evenda-text-2)" }}
          >
            <UploadIcon className="w-4 h-4" /> {t("audio_choose_file")}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={onPickFile}
            data-testid="audio-file-input"
          />
        </label>
      </div>

      {!supported ? (
        <p className="mt-3 text-xs" style={{ color: "var(--evenda-muted)" }}>
          {t("audio_unsupported")}
        </p>
      ) : null}

      {previewUrl ? (
        <div
          className="mt-5 flex items-center gap-3 p-3 bg-white rounded-xl border"
          style={{ borderColor: "var(--evenda-border)" }}
          data-testid="audio-preview"
        >
          <button
            type="button"
            onClick={togglePlay}
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ backgroundColor: "var(--evenda-bg-2)", color: "var(--evenda-primary)" }}
            data-testid="audio-preview-play"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <span className="text-xs flex-1 truncate" style={{ color: "var(--evenda-text-2)" }}>
            {previewName}
          </span>
          <button
            type="button"
            onClick={discard}
            className="text-xs uppercase tracking-[0.18em] flex items-center gap-1 px-3 py-1.5 rounded-full"
            style={{ color: "var(--evenda-muted)" }}
            data-testid="audio-discard"
          >
            <Trash2 className="w-3.5 h-3.5" /> {t("cancel")}
          </button>
          <button
            type="button"
            onClick={upload}
            disabled={uploading}
            className="text-xs uppercase tracking-[0.18em] flex items-center gap-1 px-4 py-2 rounded-full text-white disabled:opacity-60"
            style={{ backgroundColor: "var(--evenda-accent)" }}
            data-testid="audio-upload"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadIcon className="w-3.5 h-3.5" />}
            {uploading ? t("uploading") : t("audio_save")}
          </button>
          <audio
            ref={audioRef}
            src={previewUrl}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            className="hidden"
          />
        </div>
      ) : null}

      {value && !previewUrl ? (
        <div
          className="mt-5 flex items-center gap-3 p-3 bg-white rounded-xl border"
          style={{ borderColor: "var(--evenda-border)" }}
          data-testid="audio-saved"
        >
          <CheckCircle2 className="w-5 h-5" style={{ color: "var(--evenda-accent)" }} />
          <span className="text-sm flex-1 truncate" style={{ color: "var(--evenda-text-2)" }}>
            {t("audio_attached")}
          </span>
          <audio src={value} controls className="h-9" />
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-600" data-testid="audio-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
