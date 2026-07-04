import { MatchStatus, MatchStage } from '@prisma/client';
import { FixturesService } from './fixtures.service';

const baseMatch = {
  id: 'm1',
  fixtureId: 'f1',
  tournamentId: 't1',
  stage: MatchStage.R32,
  code: 'wc-r32-01',
  status: MatchStatus.LIVE,
  homeTeamId: 'th',
  awayTeamId: 'ta',
  homeScore: null,
  awayScore: null,
  homePens: null,
  awayPens: null,
};

function build(
  current: any = baseMatch,
  updated: any = { ...baseMatch, status: MatchStatus.FINISHED, homeScore: 2, awayScore: 1 },
) {
  const prisma = {
    match: {
      findUnique: jest.fn().mockResolvedValue(current),
      update: jest.fn().mockResolvedValue(updated),
    },
  } as any;
  const cache = { delByPattern: jest.fn().mockResolvedValue(undefined) } as any;
  const resultados = { onMatchFinished: jest.fn().mockResolvedValue(undefined) } as any;
  return { service: new FixturesService(prisma, cache, resultados), resultados };
}

describe('FixturesService.updateMatch — hook post-FINISHED', () => {
  it('dispara onMatchFinished cuando el partido pasa a FINISHED', async () => {
    const { service, resultados } = build();
    await service.updateMatch('m1', { status: MatchStatus.FINISHED, homeScore: 2, awayScore: 1 } as any);
    expect(resultados.onMatchFinished).toHaveBeenCalledWith(
      expect.objectContaining({ fixtureId: 'f1', code: 'wc-r32-01', homeScore: 2 }),
    );
  });

  it('NO dispara si el partido ya estaba FINISHED (edición de un resultado viejo)', async () => {
    const finished = { ...baseMatch, status: MatchStatus.FINISHED };
    const { service, resultados } = build(finished, { ...finished, homeScore: 3 });
    await service.updateMatch('m1', { homeScore: 3 } as any);
    expect(resultados.onMatchFinished).not.toHaveBeenCalled();
  });

  it('NO dispara si el update no llega a FINISHED', async () => {
    const { service, resultados } = build(baseMatch, { ...baseMatch, homeScore: 1 });
    await service.updateMatch('m1', { homeScore: 1 } as any);
    expect(resultados.onMatchFinished).not.toHaveBeenCalled();
  });

  it('un fallo del hook no rompe el PATCH', async () => {
    const { service, resultados } = build();
    resultados.onMatchFinished.mockRejectedValue(new Error('boom'));
    const updated = await service.updateMatch('m1', { status: MatchStatus.FINISHED } as any);
    expect(updated.status).toBe(MatchStatus.FINISHED);
  });
});
