import { NextResponse, type NextRequest } from 'next/server';

/**
 * Si el padre redirige al usuario a la raíz "/" en lugar de "/launch",
 * forzamos /launch para que el flujo de exchange dispare. Cualquier ruta
 * que reciba `?authorizationCode=...` y no sea /launch ni /api se reenruta.
 */
export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get('authorizationCode');
  if (!code) return NextResponse.next();
  if (url.pathname.startsWith('/launch')) return NextResponse.next();
  if (url.pathname.startsWith('/api')) return NextResponse.next();

  const dest = url.clone();
  dest.pathname = '/launch';
  return NextResponse.redirect(dest);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
