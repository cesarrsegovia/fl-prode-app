/**
 * Mapeo de datos crudos de Player (sembrados en BD) a claves i18n de
 * `common.player`. Convención del proyecto: el texto de BD es dato; la
 * traducción se resuelve en el front por clave.
 */

const POSITIONS = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'] as const;

/** "Goalkeeper" -> clave de common.player.positions, o null si es desconocida. */
export function positionKey(position: string | null | undefined): string | null {
  return position && (POSITIONS as readonly string[]).includes(position)
    ? position
    : null;
}

const STAFF_ROLES = ['entrenador', 'asistentetecnico', 'directortecnico'];

/**
 * Rol de cuerpo técnico sembrado en español ("Asistente tecnico",
 * "Director Técnico") -> clave de common.player.roles, tolerante a
 * acentos/mayúsculas. Null si no se reconoce.
 */
export function staffRoleKey(role: string | null | undefined): string | null {
  if (!role) return null;
  const k = role
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  return STAFF_ROLES.includes(k) ? k : null;
}
