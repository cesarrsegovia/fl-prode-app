import { MatchStage } from '@prisma/client';
import { planBracketRelink } from './bracket-relink';

const H = 60 * 60 * 1000;

const seed = (code: string, stage: MatchStage, iso: string) => ({
  code,
  stage,
  startTime: new Date(iso),
});

const db = (
  id: string,
  stage: MatchStage,
  iso: string,
  code: string | null = null,
) => ({ id, stage, startTime: new Date(iso), code });

describe('planBracketRelink', () => {
  it('asigna por stage + horario exacto', () => {
    const plan = planBracketRelink(
      [seed('wc-r32-01', MatchStage.R32, '2026-06-28T19:00:00.000Z')],
      [db('m1', MatchStage.R32, '2026-06-28T19:00:00.000Z')],
    );
    expect(plan).toEqual([{ matchId: 'm1', code: 'wc-r32-01', alreadySet: false }]);
  });

  it('tolera horario corrido (fix-match-times) eligiendo el más cercano', () => {
    const plan = planBracketRelink(
      [
        seed('wc-r32-01', MatchStage.R32, '2026-06-28T19:00:00.000Z'),
        seed('wc-r32-02', MatchStage.R32, '2026-06-29T17:00:00.000Z'),
      ],
      [
        db('m2', MatchStage.R32, '2026-06-29T15:00:00.000Z'),
        db('m1', MatchStage.R32, '2026-06-28T21:00:00.000Z'),
      ],
    );
    expect(plan).toEqual([
      { matchId: 'm1', code: 'wc-r32-01', alreadySet: false },
      { matchId: 'm2', code: 'wc-r32-02', alreadySet: false },
    ]);
  });

  it('no cruza stages aunque el horario coincida', () => {
    expect(() =>
      planBracketRelink(
        [seed('wc-r16-01', MatchStage.R16, '2026-07-04T17:00:00.000Z')],
        [db('m1', MatchStage.R32, '2026-07-04T17:00:00.000Z')],
      ),
    ).toThrow(/sin candidato/);
  });

  it('aborta si faltan partidos en la BD para el stage', () => {
    expect(() =>
      planBracketRelink(
        [
          seed('wc-sf-01', MatchStage.SEMIFINAL, '2026-07-14T19:00:00.000Z'),
          seed('wc-sf-02', MatchStage.SEMIFINAL, '2026-07-15T19:00:00.000Z'),
        ],
        [db('m1', MatchStage.SEMIFINAL, '2026-07-15T00:00:00.000Z')],
      ),
    ).toThrow(/sin candidato/);
  });

  it('empareja por orden cronológico dentro del stage (horarios entrelazados)', () => {
    // Ambos partidos movidos pero conservando el orden temporal → mapeo correcto.
    const plan = planBracketRelink(
      [
        seed('wc-qf-01', MatchStage.QUARTERFINAL, '2026-07-09T20:00:00.000Z'),
        seed('wc-qf-02', MatchStage.QUARTERFINAL, '2026-07-10T19:00:00.000Z'),
      ],
      [
        db('mB', MatchStage.QUARTERFINAL, '2026-07-10T18:00:00.000Z'),
        db('mA', MatchStage.QUARTERFINAL, '2026-07-09T22:00:00.000Z'),
      ],
    );
    expect(plan).toEqual([
      { matchId: 'mA', code: 'wc-qf-01', alreadySet: false },
      { matchId: 'mB', code: 'wc-qf-02', alreadySet: false },
    ]);
  });

  it('aborta si no hay candidato dentro de la tolerancia', () => {
    expect(() =>
      planBracketRelink(
        [seed('wc-fin-01', MatchStage.FINAL, '2026-07-19T19:00:00.000Z')],
        [db('m1', MatchStage.FINAL, '2026-07-25T19:00:00.000Z')],
      ),
    ).toThrow(/sin candidato/);
  });

  it('aborta si el match ya tiene un code distinto', () => {
    expect(() =>
      planBracketRelink(
        [seed('wc-fin-01', MatchStage.FINAL, '2026-07-19T19:00:00.000Z')],
        [db('m1', MatchStage.FINAL, '2026-07-19T19:00:00.000Z', 'wc-sf-01')],
      ),
    ).toThrow(/ya tiene code/);
  });

  it('es idempotente: code ya correcto → alreadySet true', () => {
    const plan = planBracketRelink(
      [seed('wc-fin-01', MatchStage.FINAL, '2026-07-19T19:00:00.000Z')],
      [db('m1', MatchStage.FINAL, '2026-07-19T19:00:00.000Z', 'wc-fin-01')],
    );
    expect(plan).toEqual([{ matchId: 'm1', code: 'wc-fin-01', alreadySet: true }]);
  });

  it('respeta la tolerancia configurable', () => {
    const plan = planBracketRelink(
      [seed('wc-fin-01', MatchStage.FINAL, '2026-07-19T19:00:00.000Z')],
      [db('m1', MatchStage.FINAL, '2026-07-19T21:00:00.000Z')],
      3 * H,
    );
    expect(plan[0].matchId).toBe('m1');
  });
});
