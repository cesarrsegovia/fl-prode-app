'use server';

import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, type Locale } from './config';
import { matchLocale } from './locale-match';

// Header que el middleware setea desde `?lang=` (idioma cookieless del iframe).
const LOCALE_HEADER = 'x-prode-locale';

/**
 * Idioma efectivo de la request. Prioridad:
 *   1. Header `x-prode-locale` (viene de `?lang=` vía middleware) — funciona
 *      dentro del iframe cross-site, donde las cookies de tercero se bloquean.
 *   2. Cookie `NEXT_LOCALE` (uso first-party / standalone).
 *   3. Accept-Language del navegador.
 *   4. Default.
 */
export async function getUserLocale(): Promise<Locale> {
  const hdrs = await headers();
  const headerLocale = hdrs.get(LOCALE_HEADER) ?? null;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value ?? null;
  const acceptLanguage = hdrs.get('accept-language');
  // El header del iframe tiene prioridad: si está, manda sobre la cookie.
  return matchLocale(acceptLanguage, headerLocale ?? cookieLocale);
}

/** Persiste la elección de idioma del usuario en la cookie. */
export async function setUserLocale(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  const hdrs = await headers();
  // Prode corre embebido en un iframe cross-site (gamblor). Una cookie
  // SameSite=Lax NO se envía en ese contexto de tercero, así que el idioma
  // elegido nunca llega al server y el i18n "no anda" dentro del iframe.
  // En HTTPS usamos SameSite=None; Secure (válido también en uso first-party);
  // en dev http caemos a Lax porque None exige Secure.
  const proto =
    hdrs.get('x-forwarded-proto') ?? (process.env.NODE_ENV === 'production' ? 'https' : 'http');
  const isHttps = proto.split(',')[0].trim() === 'https';
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 año
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });
}
