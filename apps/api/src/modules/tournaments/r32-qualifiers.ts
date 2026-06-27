/**
 * Cálculo de los 32 clasificados a R32 (16vos) a partir de los partidos de la
 * fase de grupos. Lógica PURA (sin DB) extraída de
 * TournamentsService.computeR32Qualifiers para poder testearla y para exponer,
 * además del Set de clasificados, la posición (1°/2°/3°) y el grupo de cada uno
 * — necesario para rellenar las llaves.
 *
 * Reglas: top-2 de cada grupo clasifican directo; los 8 mejores terceros (entre
 * los 12) completan los 32. Desempate: puntos → diferencia de gol → goles a
 * favor (W=3, D=1, L=0), igual que el comparador histórico del servicio.
 */

export interface R32GroupMatchInput {
  groupId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export interface R32QualifiersDetailed {
  /** Los 32 teamIds clasificados (idéntico al Set histórico). */
  qualifiers: Set<string>;
  /** `${groupName}#${1|2}` -> teamId. Solo posiciones 1 y 2. */
  topByGroupPos: Map<string, string>;
  /** groupName -> teamId, solo para los terceros que clasificaron. */
  thirdByGroup: Map<string, string>;
  /** Las 8 letras de grupo cuyos terceros clasificaron, ordenadas. */
  qualifiedThirdGroups: string[];
}

interface Stats {
  teamId: string;
  groupId: string;
  groupName: string;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
}

const N_BEST_THIRDS = 8;

/**
 * Construye el detalle de clasificados. Devuelve null si falta algún dato
 * (partido sin resultado o sin equipos/grupo), reflejando "fase incompleta".
 *
 * @param groupMatches partidos de fase de grupos (todos deben estar resueltos)
 * @param groupIdToName mapa groupId (cuid) -> nombre de grupo ("A".."L")
 */
export function buildR32Detail(
  groupMatches: R32GroupMatchInput[],
  groupIdToName: Map<string, string>,
): R32QualifiersDetailed | null {
  if (!groupMatches.length) return null;

  const complete = groupMatches.every(
    (m) =>
      m.homeScore !== null &&
      m.awayScore !== null &&
      m.homeTeamId &&
      m.awayTeamId &&
      m.groupId,
  );
  if (!complete) return null;

  const stats = new Map<string, Stats>();
  const ensure = (teamId: string, groupId: string) => {
    let s = stats.get(teamId);
    if (!s) {
      s = {
        teamId,
        groupId,
        groupName: groupIdToName.get(groupId) ?? groupId,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
      };
      stats.set(teamId, s);
    }
    return s;
  };

  for (const m of groupMatches) {
    const home = ensure(m.homeTeamId!, m.groupId!);
    const away = ensure(m.awayTeamId!, m.groupId!);
    const hs = m.homeScore!;
    const as = m.awayScore!;
    home.goalsFor += hs;
    home.goalsAgainst += as;
    away.goalsFor += as;
    away.goalsAgainst += hs;
    if (hs > as) home.points += 3;
    else if (hs < as) away.points += 3;
    else {
      home.points += 1;
      away.points += 1;
    }
  }
  for (const s of stats.values()) {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  }

  const cmp = (a: Stats, b: Stats) =>
    b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor;

  const byGroup = new Map<string, Stats[]>();
  for (const s of stats.values()) {
    if (!byGroup.has(s.groupId)) byGroup.set(s.groupId, []);
    byGroup.get(s.groupId)!.push(s);
  }
  for (const arr of byGroup.values()) arr.sort(cmp);

  const qualifiers = new Set<string>();
  const topByGroupPos = new Map<string, string>();
  const thirdByGroup = new Map<string, string>();
  const thirdPlaced: Stats[] = [];

  for (const arr of byGroup.values()) {
    if (arr[0]) {
      qualifiers.add(arr[0].teamId);
      topByGroupPos.set(`${arr[0].groupName}#1`, arr[0].teamId);
    }
    if (arr[1]) {
      qualifiers.add(arr[1].teamId);
      topByGroupPos.set(`${arr[1].groupName}#2`, arr[1].teamId);
    }
    if (arr[2]) thirdPlaced.push(arr[2]);
  }

  thirdPlaced.sort(cmp);
  const bestThirds = thirdPlaced.slice(0, N_BEST_THIRDS);
  for (const t of bestThirds) {
    qualifiers.add(t.teamId);
    thirdByGroup.set(t.groupName, t.teamId);
  }
  const qualifiedThirdGroups = bestThirds.map((t) => t.groupName).sort();

  return { qualifiers, topByGroupPos, thirdByGroup, qualifiedThirdGroups };
}
