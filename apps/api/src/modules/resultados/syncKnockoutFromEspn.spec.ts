import { MatchStatus } from '@prisma/client';
import { ResultadosService } from './resultados.service';
import type { RemoteResult } from './providers/results-provider';

/**
 * Verifica el comportamiento clave de syncKnockoutFromEspn: escribe un lado SOLO
 * cuando ESPN trae un equipo real para ese lado; un lado sin abreviatura
 * (placeholder pendiente) NO se toca. Orden REAL del constructor: prisma,
 * gamificacion, notificaciones, activity, events, tournaments, cache, provider.
 */
describe('ResultadosService.syncKnockoutFromEspn', () => {
  it('escribe ambos lados si están decididos; solo el lado real si el otro está pendiente', async () => {
    // Dos partidos KO sin equipos asignados (pendientes).
    const koMatches = [
      { id: 'mA', externalId: 'espn-1', startTime: new Date(), homeTeamId: null, awayTeamId: null },
      { id: 'mB', externalId: 'espn-2', startTime: new Date(), homeTeamId: null, awayTeamId: null },
    ];

    // ESPN: partido 1 totalmente definido (PAR vs FRA); partido 2 con el
    // visitante pendiente (SUI vs placeholder sin abreviatura → awayAbbr null).
    const remote: RemoteResult[] = [
      {
        externalId: 'espn-1',
        status: MatchStatus.FINISHED,
        homeScore: 2,
        awayScore: 1,
        homeAbbr: 'PAR',
        awayAbbr: 'FRA',
      },
      {
        externalId: 'espn-2',
        status: MatchStatus.PENDING,
        homeScore: null,
        awayScore: null,
        homeAbbr: 'SUI',
        awayAbbr: null,
      },
    ];

    const teams = [
      { id: 'tPAR', name: 'Paraguay', shortName: 'PAR' },
      { id: 'tFRA', name: 'Francia', shortName: 'FRA' },
      { id: 'tSUI', name: 'Suiza', shortName: 'SUI' },
    ];

    const updateFn = jest.fn().mockResolvedValue({});
    const prisma = {
      tournament: { findFirst: jest.fn().mockResolvedValue({ id: 't1' }) },
      match: {
        findMany: jest.fn().mockResolvedValue(koMatches),
        update: updateFn,
      },
      team: { findMany: jest.fn().mockResolvedValue(teams) },
    } as any;

    const cache = { delByPattern: jest.fn().mockResolvedValue(undefined) } as any;
    const events = { emitToAll: jest.fn() } as any;
    const provider = { fetchResults: jest.fn().mockResolvedValue(remote) } as any;
    const noop = {} as any;

    const service = new ResultadosService(
      prisma,
      noop, // gamificacion
      noop, // notificaciones
      noop, // activity
      events,
      noop, // tournaments
      cache,
      provider,
    );

    const res = await service.syncKnockoutFromEspn('t1');

    // Dos partidos actualizados.
    expect(res.updated).toBe(2);
    expect(res.tournamentId).toBe('t1');
    expect(updateFn).toHaveBeenCalledTimes(2);

    // Partido totalmente decidido: se setean ambos lados.
    const callA = updateFn.mock.calls.find((c) => c[0].where.id === 'mA');
    expect(callA).toBeDefined();
    expect(callA![0].data).toMatchObject({
      homeTeamId: 'tPAR',
      homeTeamName: 'Paraguay',
      awayTeamId: 'tFRA',
      awayTeamName: 'Francia',
    });

    // Partido medio-pendiente: SOLO se setea el local (Suiza); el visitante
    // pendiente NO se escribe.
    const callB = updateFn.mock.calls.find((c) => c[0].where.id === 'mB');
    expect(callB).toBeDefined();
    expect(callB![0].data).toMatchObject({ homeTeamId: 'tSUI', homeTeamName: 'Suiza' });
    expect(callB![0].data.awayTeamId).toBeUndefined();
    expect(callB![0].data.awayTeamName).toBeUndefined();

    // Efectos secundarios de cierre.
    expect(cache.delByPattern).toHaveBeenCalledWith('fixtures:*');
    expect(events.emitToAll).toHaveBeenCalled();
  });
});
