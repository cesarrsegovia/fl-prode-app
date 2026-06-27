/**
 * Propagación de ganadores/perdedores entre rondas de eliminación. Funciones
 * PURAS (sin DB) para poder testearlas aisladas.
 *
 * Los cruces de R16 en adelante se siembran con placeholders en el nombre que
 * referencian el partido de origen, p. ej.:
 *   R16: "Ganador R32-3"   QF: "Ganador R16-1"   SF: "Ganador CF-2"
 *   3º:  "Perdedor SF-1"    Final: "Ganador SF-2"
 *
 * Cada placeholder se resuelve al `externalId` del partido de origen
 * (wc-r32-03, wc-qf-01, wc-sf-02, ...). Cuando ese partido termina, el ganador
 * (o perdedor, para el 3er puesto) ocupa el lado correspondiente.
 */

export type AdvanceRef = {
  kind: 'WINNER' | 'LOSER';
  /** externalId del partido de origen, p. ej. "wc-r32-03". */
  sourceExternalId: string;
};

// Prefijo del placeholder -> segmento del externalId.
const PREFIX_TO_SEGMENT: Record<string, string> = {
  R32: 'r32',
  R16: 'r16',
  CF: 'qf', // CF = Cuartos de Final
  SF: 'sf',
};

const ADVANCE_RE = /^(Ganador|Perdedor)\s+(R32|R16|CF|SF)-(\d{1,2})$/;

/**
 * Parsea un placeholder de avance ("Ganador R32-3", "Perdedor SF-1"). Devuelve
 * null si el texto no es un placeholder de avance (equipo ya definido, grupo,
 * etc.) — defensivo.
 */
export function parseAdvancePlaceholder(name: string): AdvanceRef | null {
  const m = ADVANCE_RE.exec(name.trim());
  if (!m) return null;
  const segment = PREFIX_TO_SEGMENT[m[2]];
  if (!segment) return null;
  const num = String(Number(m[3])).padStart(2, '0');
  return {
    kind: m[1] === 'Ganador' ? 'WINNER' : 'LOSER',
    sourceExternalId: `wc-${segment}-${num}`,
  };
}

/**
 * Determina qué lado avanza de un partido de eliminación terminado.
 * - Si el marcador no es empate: el del marcador mayor.
 * - Si es empate: el que ganó la tanda de penales.
 * - Si es empate sin penales resueltos (null/iguales): null (aún no resoluble).
 */
export function knockoutWinnerSide(
  homeScore: number | null,
  awayScore: number | null,
  homePens: number | null,
  awayPens: number | null,
): 'HOME' | 'AWAY' | null {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return 'HOME';
  if (homeScore < awayScore) return 'AWAY';
  if (homePens === null || awayPens === null || homePens === awayPens) {
    return null;
  }
  return homePens > awayPens ? 'HOME' : 'AWAY';
}

/** Lado opuesto (perdedor), o null si el ganador aún no está resuelto. */
export function knockoutLoserSide(
  winner: 'HOME' | 'AWAY' | null,
): 'HOME' | 'AWAY' | null {
  if (winner === null) return null;
  return winner === 'HOME' ? 'AWAY' : 'HOME';
}
