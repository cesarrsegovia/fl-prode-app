/**
 * Parseo de los nombres-placeholder de los cruces de R32 (16vos) sembrados en
 * español. Función pura, sin DB, para poder testearla aislada.
 *
 * Tipos de placeholder en los Match de R32 (homeTeamName/awayTeamName):
 *   - TOP:   "1° Grupo C" / "2° Grupo B"   → ganador (1) o subcampeón (2) de un grupo
 *   - THIRD: "3° (A/B/C/D/F)"               → uno de los 8 mejores terceros, de uno
 *                                              de los grupos candidatos del slot
 *   - STATIC: cualquier otro texto (no se toca; defensivo)
 */

export type ParsedR32Slot =
  | { kind: 'TOP'; position: 1 | 2; group: string }
  | { kind: 'THIRD'; candidates: string[] }
  | { kind: 'STATIC' };

const TOP_RE = /^([12])°\s+Grupo\s+([A-L])$/;
const THIRD_RE = /^3°\s*\(([A-L](?:\/[A-L])+)\)$/;

/** Parsea un nombre-placeholder de un lado de un cruce R32. */
export function parseR32Placeholder(name: string): ParsedR32Slot {
  const raw = name.trim();

  const top = TOP_RE.exec(raw);
  if (top) {
    return {
      kind: 'TOP',
      position: Number(top[1]) as 1 | 2,
      group: top[2],
    };
  }

  const third = THIRD_RE.exec(raw);
  if (third) {
    return { kind: 'THIRD', candidates: third[1].split('/') };
  }

  return { kind: 'STATIC' };
}
