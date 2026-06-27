/**
 * Asignación de los 8 mejores terceros a los 8 cruces de R32 que los esperan.
 *
 * Cada slot (partido R32 con un lado "3° (...)") admite el tercero de uno de un
 * conjunto fijo de grupos candidatos. Dado el conjunto concreto de 8 grupos
 * cuyos terceros clasificaron, hay que decidir qué grupo va a cada slot
 * respetando esos candidatos.
 *
 * IMPORTANTE: esto produce una PROPUESTA (matching que respeta los candidatos);
 * no es necesariamente la asignación oficial de FIFA en combinaciones ambiguas.
 * Por eso el flujo de producto exige confirmación del admin antes de publicar.
 *
 * Función pura, sin DB.
 */

/** externalId de los 8 partidos R32 cuyo lado local es un tercero. */
export const R32_THIRD_SLOTS = [
  'wc-r32-03',
  'wc-r32-06',
  'wc-r32-07',
  'wc-r32-08',
  'wc-r32-09',
  'wc-r32-10',
  'wc-r32-13',
  'wc-r32-16',
] as const;

export type R32ThirdSlot = (typeof R32_THIRD_SLOTS)[number];

/**
 * Grupos candidatos de cada slot, tomados de los placeholders sembrados
 * ("3° (A/B/C/D/F)" → ['A','B','C','D','F']). Fuente: worldcup-2026.json.
 */
export const R32_THIRD_SLOT_CANDIDATES: Record<R32ThirdSlot, readonly string[]> = {
  'wc-r32-03': ['A', 'B', 'C', 'D', 'F'],
  'wc-r32-06': ['C', 'D', 'F', 'G', 'H'],
  'wc-r32-07': ['C', 'E', 'F', 'H', 'I'],
  'wc-r32-08': ['E', 'H', 'I', 'J', 'K'],
  'wc-r32-09': ['A', 'E', 'H', 'I', 'J'],
  'wc-r32-10': ['B', 'E', 'F', 'I', 'J'],
  'wc-r32-13': ['E', 'F', 'G', 'I', 'J'],
  'wc-r32-16': ['D', 'E', 'I', 'J', 'L'],
};

export class R32ThirdsUnassignableError extends Error {
  constructor(public readonly qualifiedThirdGroups: string[]) {
    super(
      `No existe asignación de terceros que respete los candidatos para los grupos [${qualifiedThirdGroups.join(
        ', ',
      )}]`,
    );
    this.name = 'R32ThirdsUnassignableError';
  }
}

/**
 * Propone una asignación slot→grupo respetando los candidatos de cada slot.
 *
 * Usa backtracking ordenando los slots por menor cantidad de candidatos
 * disponibles primero (most-constrained-first), que para 8×8 es instantáneo y
 * encuentra una asignación válida si existe.
 *
 * @param qualifiedThirdGroups las 8 letras de grupo cuyos terceros clasificaron
 * @returns un mapa slot→groupLetter, o lanza R32ThirdsUnassignableError
 */
export function proposeR32Thirds(
  qualifiedThirdGroups: string[],
): Record<R32ThirdSlot, string> {
  const groups = [...new Set(qualifiedThirdGroups)];
  if (groups.length !== R32_THIRD_SLOTS.length) {
    throw new R32ThirdsUnassignableError(qualifiedThirdGroups);
  }

  // Candidatos efectivos por slot: solo grupos que realmente clasificaron.
  const groupSet = new Set(groups);
  const slotOptions = R32_THIRD_SLOTS.map((slot) => ({
    slot,
    options: R32_THIRD_SLOT_CANDIDATES[slot].filter((g) => groupSet.has(g)),
  }));

  const assignment: Partial<Record<R32ThirdSlot, string>> = {};
  const used = new Set<string>();

  // Orden fijo most-constrained-first (sin Math.random): por nº de opciones asc,
  // y por externalId para que sea determinista.
  const order = [...slotOptions].sort(
    (a, b) => a.options.length - b.options.length || a.slot.localeCompare(b.slot),
  );

  const solve = (idx: number): boolean => {
    if (idx === order.length) return true;
    const { slot, options } = order[idx];
    for (const g of options) {
      if (used.has(g)) continue;
      assignment[slot] = g;
      used.add(g);
      if (solve(idx + 1)) return true;
      used.delete(g);
      delete assignment[slot];
    }
    return false;
  };

  if (!solve(0)) {
    throw new R32ThirdsUnassignableError(qualifiedThirdGroups);
  }
  return assignment as Record<R32ThirdSlot, string>;
}
