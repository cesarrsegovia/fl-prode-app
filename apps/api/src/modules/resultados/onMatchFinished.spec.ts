import { MatchStage } from '@prisma/client';
import { ResultadosService, type FinishedMatchInfo } from './resultados.service';

// Construye el service con 8 mocks vacíos en el orden REAL del constructor
// (prisma, gamificacion, notificaciones, activity, events, tournaments, cache,
// provider). El constructor solo guarda referencias, así que objetos vacíos
// alcanzan. Espiamos los 3 métodos internos para aislar el branching por stage.
function makeService() {
  const m = {} as any;
  const service = new ResultadosService(m, m, m, m, m, m, m, m);
  const calc = jest
    .spyOn(service as any, 'calculatePoints')
    .mockResolvedValue(undefined);
  const standings = jest
    .spyOn(service as any, 'refreshGroupStandings')
    .mockResolvedValue(undefined);
  const knockout = jest
    .spyOn(service as any, 'handleKnockoutFinished')
    .mockResolvedValue(undefined);
  return { service, calc, standings, knockout };
}

const base: FinishedMatchInfo = {
  fixtureId: 'f1',
  tournamentId: 't1',
  stage: MatchStage.GROUP,
  code: null,
  homeTeamId: 'th',
  awayTeamId: 'ta',
  homeScore: 1,
  awayScore: 0,
  homePens: null,
  awayPens: null,
};

describe('ResultadosService.onMatchFinished — branching por stage', () => {
  it('GROUP: calcula puntos y refresca standings, sin propagación', async () => {
    const { service, calc, standings, knockout } = makeService();
    await service.onMatchFinished({ ...base, stage: MatchStage.GROUP });
    expect(calc).toHaveBeenCalledWith('f1');
    expect(standings).toHaveBeenCalledWith('t1');
    expect(knockout).not.toHaveBeenCalled();
  });

  it('knockout (R32): calcula puntos y propaga, sin standings', async () => {
    const { service, calc, standings, knockout } = makeService();
    const m = { ...base, stage: MatchStage.R32, code: 'wc-r32-01' };
    await service.onMatchFinished(m);
    expect(calc).toHaveBeenCalledWith('f1');
    expect(knockout).toHaveBeenCalledWith(m);
    expect(standings).not.toHaveBeenCalled();
  });
});
