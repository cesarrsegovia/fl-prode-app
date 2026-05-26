/**
 * Configuración de idiomas. Enfoque cookie-based (sin i18n routing): el idioma
 * NO va en la URL ni cambia rutas/carpetas — vive en una cookie y se resuelve
 * server-side en cada request. `en` es el default y el idioma fuente de los
 * catálogos.
 */
export const locales = ['en', 'es', 'fr', 'de'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** Nombres nativos para el selector de idioma. */
export const localeLabels: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
};
