/**
 * Lightweight i18n for Welgo Desk (Preact).
 *
 * Usage:
 *   import { useI18n } from '../lib/i18n';
 *   const { t, lang, setLang } = useI18n();
 *   <span>{t('sidebar.new_chat')}</span>
 */
import { createContext } from "preact";
import { useState, useContext, useCallback, useMemo } from "preact/hooks";
import ru from "./ru.js";
import uz from "./uz.js";

const CATALOGS = { ru, uz };
const SUPPORTED = ["ru", "uz"];
const DEFAULT_LANG = "ru";

const I18nContext = createContext(null);

/**
 * Translate a key, with optional interpolation.
 * `t('pending.desc', { org: 'Welgo' })` → replaces `{org}` in the string.
 */
function translate(catalog, key, params) {
  let text = catalog[key] ?? CATALOGS.ru[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}

export function I18nProvider({ initialLang = DEFAULT_LANG, children }) {
  const [lang, setLangState] = useState(
    SUPPORTED.includes(initialLang) ? initialLang : DEFAULT_LANG
  );

  const catalog = useMemo(() => CATALOGS[lang] ?? CATALOGS.ru, [lang]);

  const t = useCallback(
    (key, params) => translate(catalog, key, params),
    [catalog]
  );

  const setLang = useCallback((newLang) => {
    if (SUPPORTED.includes(newLang)) setLangState(newLang);
  }, []);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Fallback for components rendered outside provider (shouldn't happen)
    return {
      t: (key, params) => translate(CATALOGS.ru, key, params),
      lang: DEFAULT_LANG,
      setLang: () => {},
    };
  }
  return ctx;
}
