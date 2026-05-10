import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "./translations";

const I18nContext = createContext(null);
const STORAGE_KEY = "evenda.lang";

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "vh";
    return window.localStorage.getItem(STORAGE_KEY) || "vh";
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang === "vh" ? "ven" : "en";
    } catch {
      /* ignore */
    }
  }, [lang]);

  const t = useCallback(
    (key, fallback) => {
      const dict = translations[lang] || translations.en;
      const value = dict[key];
      if (value !== undefined) return value;
      // fallback to english then to provided fallback then to key
      return translations.en[key] ?? fallback ?? key;
    },
    [lang]
  );

  const toggle = useCallback(() => {
    setLang((l) => (l === "vh" ? "en" : "vh"));
  }, []);

  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, t, toggle]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
