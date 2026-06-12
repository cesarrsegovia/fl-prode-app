import { locales, type Locale } from './config';

/** Clave de localStorage donde el iframe persiste el idioma (cookieless). */
export const LOCALE_STORAGE_KEY = 'prode.locale';

const SUPPORTED = new Set<string>(locales);

/** Lee el idioma guardado en localStorage, validado, o null. */
export function readStoredLocale(): Locale | null {
  try {
    const v = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return v && SUPPORTED.has(v) ? (v as Locale) : null;
  } catch {
    return null;
  }
}
