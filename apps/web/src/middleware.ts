import { NextResponse, type NextRequest } from 'next/server';

// Orígenes del casino autorizados a embeber Prode (coma-separados).
// Fail-closed: si no hay env, frame-ancestors = 'none' (no embebible por nadie).
const parentOrigins = (process.env.NEXT_PUBLIC_PARENT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const userFrameAncestors = parentOrigins.length ? parentOrigins.join(' ') : "'none'";

// Idiomas soportados (debe coincidir con i18n/config.ts). Se duplica acá porque
// el middleware corre en el edge y no debe arrastrar imports pesados.
const SUPPORTED_LOCALES = new Set(['en', 'es', 'fr', 'de']);
// Header con el que el middleware le pasa el idioma de ?lang= al server.
// next-intl resuelve mensajes server-side y no ve la query directamente, así
// que el idioma del iframe (cookieless) viaja por este header de request.
const LOCALE_HEADER = 'x-prode-locale';

/** Aplica un único header CSP frame-ancestors según la ruta. */
function applyFrameAncestors(req: NextRequest, res: NextResponse): NextResponse {
  // El panel admin nunca debe ser embebible.
  const value = req.nextUrl.pathname.startsWith('/admin')
    ? "frame-ancestors 'none';"
    : `frame-ancestors ${userFrameAncestors};`;
  res.headers.set('Content-Security-Policy', value);
  return res;
}

/** Locale válido pedido por la query `?lang=`/`?locale=`, o null. */
function requestedLocale(url: URL): string | null {
  const raw = (
    url.searchParams.get('lang') || url.searchParams.get('locale') || ''
  )
    .trim()
    .toLowerCase();
  return SUPPORTED_LOCALES.has(raw) ? raw : null;
}

/** Reenvía el locale de la query al server via header de request (cookieless). */
function forwardLocale(req: NextRequest, locale: string | null): NextResponse {
  if (!locale) return NextResponse.next();
  const headers = new Headers(req.headers);
  headers.set(LOCALE_HEADER, locale);
  return NextResponse.next({ request: { headers } });
}

/**
 * 1) Si el padre redirige al usuario con `?authorizationCode=...` a una ruta que no
 *    sea /launch ni /api, reenruta a /launch para disparar el exchange.
 * 2) Idioma cookieless: si la URL trae `?lang=xx`, lo pasa al server por header
 *    (la cookie SameSite=None se bloquea dentro del iframe cross-site).
 * 3) En toda respuesta, fija el header CSP frame-ancestors (uno solo, sin ambigüedad).
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const locale = requestedLocale(url);
  // El padre puede mandar el code como `authorizationCode` (contrato) o `token`
  // (game_url del agregador, p. ej. `/?consumer=gamblor&embed=1&token=...`).
  const code =
    url.searchParams.get('authorizationCode') || url.searchParams.get('token');

  if (code && !url.pathname.startsWith('/launch') && !url.pathname.startsWith('/api')) {
    const dest = url.clone();
    dest.pathname = '/launch';
    // Normalizamos a `authorizationCode` para que /launch lo lea de una sola forma.
    dest.searchParams.set('authorizationCode', code);
    dest.searchParams.delete('token');
    if (locale) dest.searchParams.set('lang', locale);
    return applyFrameAncestors(req, NextResponse.redirect(dest));
  }

  return applyFrameAncestors(req, forwardLocale(req, locale));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
