import { NextResponse, type NextRequest } from 'next/server';

// Orígenes del casino autorizados a embeber Prode (coma-separados).
// Fail-closed: si no hay env, frame-ancestors = 'none' (no embebible por nadie).
const parentOrigins = (process.env.NEXT_PUBLIC_PARENT_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const userFrameAncestors = parentOrigins.length ? parentOrigins.join(' ') : "'none'";

/** Aplica un único header CSP frame-ancestors según la ruta. */
function applyFrameAncestors(req: NextRequest, res: NextResponse): NextResponse {
  // El panel admin nunca debe ser embebible.
  const value = req.nextUrl.pathname.startsWith('/admin')
    ? "frame-ancestors 'none';"
    : `frame-ancestors ${userFrameAncestors};`;
  res.headers.set('Content-Security-Policy', value);
  return res;
}

/**
 * 1) Si el padre redirige al usuario con `?authorizationCode=...` a una ruta que no
 *    sea /launch ni /api, reenruta a /launch para disparar el exchange.
 * 2) En toda respuesta, fija el header CSP frame-ancestors (uno solo, sin ambigüedad).
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
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
    return applyFrameAncestors(req, NextResponse.redirect(dest));
  }

  return applyFrameAncestors(req, NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
