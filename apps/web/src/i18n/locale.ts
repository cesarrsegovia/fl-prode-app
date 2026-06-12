'use server';

import { cookies, headers } from 'next/headers';
import { LOCALE_COOKIE, type Locale } from './config';
import { matchLocale } from './locale-match';

/** Idioma efectivo de la request (cookie > Accept-Language > default). */
export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value ?? null;
  const acceptLanguage = (await headers()).get('accept-language');
  return matchLocale(acceptLanguage, cookieLocale);
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
