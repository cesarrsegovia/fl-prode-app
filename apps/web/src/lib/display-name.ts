/**
 * Algunos usuarios del provider (Gamblor) entran sin nickname legible y su
 * `username` quedó con un identificador interno tipo cuid
 * (ej. "cmq0row8z000004l2qvbynpny"). Mostrar ese código es feo, así que lo
 * reemplazamos en el front por un nombre amigable y estable: "Jugador #xxxx".
 *
 * Es puramente visual: no toca la BD. Si el usuario edita su nombre a algo
 * legible, esa cadena se muestra tal cual.
 */

/** cuid v1: 'c' + 24 chars [a-z0-9]. cuid2: 24-32 chars [a-z0-9] sin guiones. */
const CUID_RE = /^c[a-z0-9]{24}$/;
const OPAQUE_ID_RE = /^[a-z0-9]{20,32}$/;

/** True si el username parece un ID generado en vez de un nombre elegido. */
export function looksLikeGeneratedId(name: string): boolean {
  const v = name.trim();
  return CUID_RE.test(v) || OPAQUE_ID_RE.test(v);
}

/**
 * Nombre a mostrar para un usuario. Si el username es legible, lo devuelve
 * tal cual. Si parece un ID generado (o está vacío), devuelve "Jugador #xxxx"
 * usando los últimos 4 caracteres del id/username para que sea estable y
 * distinga jugadores entre sí.
 */
export function displayName(
  username?: string | null,
  fallbackSeed?: string | null,
): string {
  const v = (username ?? '').trim();
  if (v && !looksLikeGeneratedId(v)) return v;
  const seed = (v || fallbackSeed || '').trim();
  const suffix = seed.slice(-4).toUpperCase();
  return suffix ? `Jugador #${suffix}` : 'Jugador';
}
