import {
  proposeR32Thirds,
  R32_THIRD_SLOTS,
  R32_THIRD_SLOT_CANDIDATES,
  R32ThirdsUnassignableError,
  type R32ThirdSlot,
} from './r32-thirds';

/** Genera todas las combinaciones de k elementos de arr. */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const [head, ...rest] = arr;
  const withHead = combinations(rest, k - 1).map((c) => [head, ...c]);
  const withoutHead = combinations(rest, k);
  return [...withHead, ...withoutHead];
}

const ALL_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

describe('proposeR32Thirds', () => {
  it('respeta los grupos candidatos de cada slot', () => {
    // Una combinación válida cualquiera de 8 grupos.
    const result = proposeR32Thirds(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    for (const slot of R32_THIRD_SLOTS) {
      const g = result[slot];
      expect(R32_THIRD_SLOT_CANDIDATES[slot]).toContain(g);
    }
  });

  it('asigna los 8 grupos sin repetir y usando exactamente el input', () => {
    const input = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const result = proposeR32Thirds(input);
    const assigned = Object.values(result);
    expect(new Set(assigned).size).toBe(8); // sin repetir
    expect([...assigned].sort()).toEqual([...input].sort()); // mismos grupos
  });

  it('lanza si no recibe exactamente 8 grupos distintos', () => {
    expect(() => proposeR32Thirds(['A', 'B', 'C'])).toThrow(
      R32ThirdsUnassignableError,
    );
    expect(() => proposeR32Thirds(['A', 'A', 'B', 'C', 'D', 'E', 'F', 'G'])).toThrow(
      R32ThirdsUnassignableError,
    );
  });

  it('propiedad: TODA combinación de 8 de los 12 grupos es resoluble respetando candidatos', () => {
    // El diseño de los sets de candidatos garantiza un matching perfecto para
    // cualquier subconjunto de 8 grupos. Verificamos las 495 combinaciones.
    const combos = combinations(ALL_GROUPS, 8);
    expect(combos.length).toBe(495);
    let solved = 0;
    for (const combo of combos) {
      const result = proposeR32Thirds(combo);
      // cada slot recibe un grupo de su set de candidatos y de la combinación
      const comboSet = new Set(combo);
      for (const slot of R32_THIRD_SLOTS) {
        expect(comboSet.has(result[slot])).toBe(true);
        expect(R32_THIRD_SLOT_CANDIDATES[slot]).toContain(result[slot]);
      }
      expect(new Set(Object.values(result)).size).toBe(8);
      solved++;
    }
    expect(solved).toBe(495);
  });

  it('es determinista (misma entrada → misma salida)', () => {
    const input = ['B', 'D', 'E', 'F', 'I', 'J', 'K', 'L'];
    const a = proposeR32Thirds(input);
    const b = proposeR32Thirds([...input].reverse());
    expect(a).toEqual(b);
  });
});
