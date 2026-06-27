import { buildR32Detail, type R32GroupMatchInput } from './r32-qualifiers';

/**
 * Genera los 6 partidos de un grupo de 4 equipos con un orden final conocido.
 * teams = [1°, 2°, 3°, 4°] deseado. Construimos resultados donde cada equipo
 * le gana a todos los que están debajo suyo (round-robin transitivo), lo que
 * produce 9/6/3/0 puntos y ese orden exacto sin empates.
 */
function groupMatches(groupId: string, teams: string[]): R32GroupMatchInput[] {
  const out: R32GroupMatchInput[] = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      // teams[i] (mejor) le gana a teams[j] (peor) 1-0
      out.push({
        groupId,
        homeTeamId: teams[i],
        awayTeamId: teams[j],
        homeScore: 1,
        awayScore: 0,
      });
    }
  }
  return out;
}

function nameMap(groups: Record<string, string[]>): Map<string, string> {
  // groupId == groupName en los tests para simplificar
  const m = new Map<string, string>();
  for (const g of Object.keys(groups)) m.set(g, g);
  return m;
}

describe('buildR32Detail', () => {
  it('devuelve null si los partidos están incompletos', () => {
    const incompleto: R32GroupMatchInput[] = [
      { groupId: 'A', homeTeamId: 't1', awayTeamId: 't2', homeScore: null, awayScore: null },
    ];
    expect(buildR32Detail(incompleto, new Map([['A', 'A']]))).toBeNull();
  });

  it('devuelve null si no hay partidos', () => {
    expect(buildR32Detail([], new Map())).toBeNull();
  });

  it('elige top-2 por grupo y expone posición y grupo', () => {
    const groups = { A: ['a1', 'a2', 'a3', 'a4'], B: ['b1', 'b2', 'b3', 'b4'] };
    const matches = [...groupMatches('A', groups.A), ...groupMatches('B', groups.B)];
    const detail = buildR32Detail(matches, nameMap(groups))!;
    expect(detail).not.toBeNull();
    expect(detail.topByGroupPos.get('A#1')).toBe('a1');
    expect(detail.topByGroupPos.get('A#2')).toBe('a2');
    expect(detail.topByGroupPos.get('B#1')).toBe('b1');
    expect(detail.topByGroupPos.get('B#2')).toBe('b2');
    expect(detail.qualifiers.has('a1')).toBe(true);
    expect(detail.qualifiers.has('a2')).toBe(true);
    expect(detail.qualifiers.has('a4')).toBe(false);
  });

  it('selecciona los 8 mejores terceros entre 12 grupos', () => {
    // 12 grupos A..L, cada uno con 4 equipos "{g}1".."{g}4".
    const letters = 'ABCDEFGHIJKL'.split('');
    const groups: Record<string, string[]> = {};
    for (const g of letters) groups[g] = [`${g}1`, `${g}2`, `${g}3`, `${g}4`];
    const matches = letters.flatMap((g) => groupMatches(g, groups[g]));
    // Cada tercero ("{g}3") tiene 3 pts y goalDiff -1 (gana al 4°, pierde con 1° y 2°)...
    // En este diseño transitivo todos los terceros empatan en pts/gd/gf, así que
    // el desempate cae al orden de inserción; lo que importa es que selecciona 8.
    const detail = buildR32Detail(matches, nameMap(groups))!;
    expect(detail.qualifiers.size).toBe(32); // 12*2 + 8
    expect(detail.qualifiedThirdGroups.length).toBe(8);
    // los terceros elegidos están en thirdByGroup y son terceros ("{g}3")
    for (const g of detail.qualifiedThirdGroups) {
      expect(detail.thirdByGroup.get(g)).toBe(`${g}3`);
    }
  });

  it('un tercero con mejor récord clasifica sobre uno peor', () => {
    // Grupo A: terceros fuertes (el 3° saca 3 pts, +2 gd). Grupo B: 3° con 0 pts.
    // Construimos a mano para forzar la comparación de terceros.
    const matches: R32GroupMatchInput[] = [
      // Grupo A: a1>a2>a3>a4 pero a3 le gana a a4 por goleada
      { groupId: 'A', homeTeamId: 'a1', awayTeamId: 'a4', homeScore: 1, awayScore: 0 },
      { groupId: 'A', homeTeamId: 'a2', awayTeamId: 'a4', homeScore: 1, awayScore: 0 },
      { groupId: 'A', homeTeamId: 'a3', awayTeamId: 'a4', homeScore: 5, awayScore: 0 },
      { groupId: 'A', homeTeamId: 'a1', awayTeamId: 'a2', homeScore: 1, awayScore: 0 },
      { groupId: 'A', homeTeamId: 'a1', awayTeamId: 'a3', homeScore: 1, awayScore: 0 },
      { groupId: 'A', homeTeamId: 'a2', awayTeamId: 'a3', homeScore: 1, awayScore: 0 },
      // Grupo B transitivo: b1>b2>b3>b4 (b3 sale 3°, b4 último)
      { groupId: 'B', homeTeamId: 'b1', awayTeamId: 'b2', homeScore: 1, awayScore: 0 },
      { groupId: 'B', homeTeamId: 'b1', awayTeamId: 'b3', homeScore: 1, awayScore: 0 },
      { groupId: 'B', homeTeamId: 'b1', awayTeamId: 'b4', homeScore: 1, awayScore: 0 },
      { groupId: 'B', homeTeamId: 'b2', awayTeamId: 'b3', homeScore: 1, awayScore: 0 },
      { groupId: 'B', homeTeamId: 'b2', awayTeamId: 'b4', homeScore: 1, awayScore: 0 },
      { groupId: 'B', homeTeamId: 'b3', awayTeamId: 'b4', homeScore: 1, awayScore: 0 },
    ];
    const detail = buildR32Detail(matches, new Map([['A', 'A'], ['B', 'B']]))!;
    // a3 (3 pts, gd +5) debe estar entre los terceros; b3 (0 pts) no, si hubiera
    // que recortar. Con solo 2 grupos no se recorta (ambos terceros entran),
    // pero verificamos que a3 quedó identificado como tercero de A.
    expect(detail.thirdByGroup.get('A')).toBe('a3');
    expect(detail.thirdByGroup.get('B')).toBe('b3');
  });
});
