import { MatchStage } from '@prisma/client';

/**
 * Reasignación de Match.code para BDs donde db:map-espn-ids pisó los
 * externalId de siembra (prod). Matchea cada partido KO del JSON de siembra
 * contra la BD emparejando, dentro de cada stage, por orden cronológico.
 * Funciones PURAS (sin DB) para testearlas aisladas.
 *
 * SUPUESTO (válido para los datos reales del Mundial): dentro de un mismo
 * stage, los horarios de la BD conservan el mismo orden cronológico que la
 * siembra (db:fix-match-times solo hace correcciones chicas, sin reordenar
 * partidos vecinos). El emparejamiento posicional por tiempo es correcto bajo
 * ese supuesto. Si una corrección grande invirtiera el orden de dos partidos
 * vecinos, el emparejamiento por tiempo sería intrínsecamente ambiguo; por eso
 * el endpoint admin devuelve los conteos y el bracket debe verificarse en la
 * UI tras correr el relink.
 */

export interface SeedKnockoutMatch {
  /** Id de siembra del JSON (wc-r32-03). */
  code: string;
  stage: MatchStage;
  startTime: Date;
}

export interface DbKnockoutMatch {
  id: string;
  stage: MatchStage;
  startTime: Date;
  code: string | null;
}

export interface RelinkAssignment {
  matchId: string;
  code: string;
  /** true si el match ya tenía este code (no hay que escribir). */
  alreadySet: boolean;
}

/** ±36 h: cubre correcciones de horario de db:fix-match-times y husos. */
const DEFAULT_TOLERANCE_MS = 36 * 60 * 60 * 1000;

const byStartTime = (a: { startTime: Date }, b: { startTime: Date }) =>
  a.startTime.getTime() - b.startTime.getTime();

/**
 * Decide qué code va a qué match. Estricta: lanza Error (sin resultado
 * parcial) si algún seed no tiene partido en la BD dentro de la tolerancia, o
 * si un match ya tiene un code distinto al esperado. Empareja, por stage, el
 * i-ésimo seed (ordenado por hora) con el i-ésimo partido de la BD (ordenado
 * por hora).
 */
export function planBracketRelink(
  seedMatches: SeedKnockoutMatch[],
  dbMatches: DbKnockoutMatch[],
  toleranceMs = DEFAULT_TOLERANCE_MS,
): RelinkAssignment[] {
  const dbByStage = new Map<MatchStage, DbKnockoutMatch[]>();
  for (const m of dbMatches) {
    const arr = dbByStage.get(m.stage) ?? [];
    arr.push(m);
    dbByStage.set(m.stage, arr);
  }

  const seedsByStage = new Map<MatchStage, SeedKnockoutMatch[]>();
  for (const s of seedMatches) {
    const arr = seedsByStage.get(s.stage) ?? [];
    arr.push(s);
    seedsByStage.set(s.stage, arr);
  }

  const out: RelinkAssignment[] = [];
  for (const [stage, seeds] of seedsByStage) {
    const ss = seeds.slice().sort(byStartTime);
    const ms = (dbByStage.get(stage) ?? []).slice().sort(byStartTime);
    for (let i = 0; i < ss.length; i++) {
      const s = ss[i];
      const m = ms[i];
      if (!m) {
        throw new Error(
          `Relink: sin candidato en BD para ${s.code} (${s.stage} @ ${s.startTime.toISOString()})`,
        );
      }
      const diff = Math.abs(m.startTime.getTime() - s.startTime.getTime());
      if (diff > toleranceMs) {
        throw new Error(
          `Relink: sin candidato en BD para ${s.code} dentro de la tolerancia (${s.stage} @ ${s.startTime.toISOString()})`,
        );
      }
      if (m.code && m.code !== s.code) {
        throw new Error(
          `Relink: el partido ${m.id} ya tiene code ${m.code}; esperado ${s.code}`,
        );
      }
      out.push({ matchId: m.id, code: s.code, alreadySet: m.code === s.code });
    }
  }
  return out;
}
