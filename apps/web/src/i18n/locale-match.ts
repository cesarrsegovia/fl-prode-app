import { defaultLocale, locales, type Locale } from './config';

const SUPPORTED = new Set<string>(locales);

/**
 * Resuelve el idioma efectivo de forma pura (testeable). Prioridad:
 *   1. Cookie explícita del usuario (eligió antes).
 *   2. Mejor match del header Accept-Language del navegador.
 *   3. Default (en).
 *
 * Acepta variantes regionales (`es-AR` → `es`) y respeta los pesos `q=`.
 */
export function matchLocale(
  acceptLanguage: string | null,
  cookieLocale: string | null,
): Locale {
  if (cookieLocale && SUPPORTED.has(cookieLocale)) {
    return cookieLocale as Locale;
  }

  if (acceptLanguage) {
    const ranked = acceptLanguage
      .split(',')
      .map((part) => {
        const [tag, q] = part.trim().split(';q=');
        return { tag: tag.toLowerCase(), q: q ? Number.parseFloat(q) : 1 };
      })
      .sort((a, b) => b.q - a.q);

    for (const { tag } of ranked) {
      if (SUPPORTED.has(tag)) return tag as Locale;
      const base = tag.split('-')[0];
      if (SUPPORTED.has(base)) return base as Locale;
    }
  }

  return defaultLocale;
}
