/**
 * ¿Hay un capitán ya confirmado (guardado) en esta fecha? El capitán se elige
 * una vez por fecha: una vez persistido un pick con isCaptain, queda bloqueado.
 */
export function isCaptainLocked(saved: { isCaptain?: boolean }[]): boolean {
  return saved.some((p) => p.isCaptain === true);
}

/**
 * Partidos elegibles como capitán: solo los que aún no cerraron (no comenzados).
 */
export function eligibleCaptainMatches<T extends { id: string }>(
  matches: T[],
  isClosed: (id: string) => boolean,
): T[] {
  return matches.filter((m) => !isClosed(m.id));
}
