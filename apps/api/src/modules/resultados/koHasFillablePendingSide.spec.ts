import { MatchStage, MatchStatus } from '@prisma/client';
import { ResultadosService } from './resultados.service';

/**
 * Tests aislados del guard `koHasFillablePendingSide`. Es privado, así que se
 * invoca vía `(service as any)`. El servicio se construye con mocks mínimos:
 * solo `prisma.match.findMany` y `prisma.match.count` participan del guard.
 */
describe('ResultadosService.koHasFillablePendingSide', () => {
  function buildService(prismaMock: any): ResultadosService {
    // Orden del constructor: prisma, gamificacion, notificaciones, activity,
    // events, tournaments, cache, provider.
    return new ResultadosService(
      prismaMock,
      {} as any, // gamificacion
      {} as any, // notificaciones
      {} as any, // activity
      {} as any, // events
      {} as any, // tournaments
      {} as any, // cache
      {} as any, // provider
    );
  }

  it('A) devuelve true cuando un cruce con lado null tiene su ronda previa completa', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ stage: MatchStage.SEMIFINAL, tournamentId: 't1' }]);
    const count = jest.fn().mockResolvedValue(0); // sin QF sin terminar
    const service = buildService({ match: { findMany, count } });

    const result = await (service as any).koHasFillablePendingSide();

    expect(result).toBe(true);
    expect(count).toHaveBeenCalledWith({
      where: {
        tournamentId: 't1',
        stage: MatchStage.QUARTERFINAL,
        status: { not: MatchStatus.FINISHED },
      },
    });
  });

  it('B) devuelve false cuando la ronda previa aún no terminó', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([{ stage: MatchStage.SEMIFINAL, tournamentId: 't1' }]);
    const count = jest.fn().mockResolvedValue(2); // 2 QF pendientes
    const service = buildService({ match: { findMany, count } });

    const result = await (service as any).koHasFillablePendingSide();

    expect(result).toBe(false);
  });

  it('C) devuelve false cuando no hay cruces con lado pendiente', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn();
    const service = buildService({ match: { findMany, count } });

    const result = await (service as any).koHasFillablePendingSide();

    expect(result).toBe(false);
    expect(count).not.toHaveBeenCalled();
  });
});
