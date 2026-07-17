import { Injectable, Logger, Inject } from '@nestjs/common';
import { ActivityType, MatchStage, MatchStatus, NotificationType, Prisma, Result } from '@prisma/client';
import {
  WS_EVENTS,
  isKnockoutStage,
  MatchStage as SharedMatchStage,
} from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { GamificacionService } from '../gamificacion/gamificacion.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ActivityService } from '../activity/activity.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import { knockoutWinnerSide } from '../tournaments/knockout-advance';
import {
  ActiveMatchWithTeams,
  RemoteResult,
  RESULTS_PROVIDER,
  ResultsProvider,
} from './providers/results-provider';
import { matchRemoteToLocal } from './providers/match-remote';
import {
  computePredictionOutcome,
  computeKnockoutOutcome,
  aggregateScoredPredictions,
  type ScoredPredictionInput,
} from './scoring';
import { matchResultPhrase, dailySummaryPhrase } from './activity-phrases';

/**
 * Zona horaria canónica del producto para delimitar el "día" del resumen
 * diario. Debe coincidir con la `timeZone` que usa el front (i18n/request.ts).
 */
const PRODUCT_TIME_ZONE = 'America/Argentina/Buenos_Aires';

/** Datos mínimos de un partido recién FINISHED para disparar la cadena post-resultado. */
export interface FinishedMatchInfo {
  fixtureId: string;
  tournamentId: string;
  stage: MatchStage;
  code: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  homePens: number | null;
  awayPens: number | null;
}

@Injectable()
export class ResultadosService {
  private readonly logger = new Logger(ResultadosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificacion: GamificacionService,
    private readonly notificaciones: NotificacionesService,
    private readonly activity: ActivityService,
    private readonly events: EventsGateway,
    private readonly tournaments: TournamentsService,
    private readonly cache: CacheService,
    @Inject(RESULTS_PROVIDER) private readonly provider: ResultsProvider,
  ) {}

  async fetchAndUpdateResults() {
    const activeMatches = await this.prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.LIVE, MatchStatus.PENDING] },
        externalId: { not: null },
      },
      select: {
        id: true,
        externalId: true,
        startTime: true,
        status: true,
        homeScore: true,
        awayScore: true,
        fixtureId: true,
        stage: true,
        tournamentId: true,
        homeTeamId: true,
        awayTeamId: true,
        code: true,
        homeTeam: { select: { shortName: true } },
        awayTeam: { select: { shortName: true } },
      },
    });
    if (!activeMatches.length) return;

    const locals: ActiveMatchWithTeams[] = activeMatches.map((m) => ({
      id: m.id,
      externalId: m.externalId!,
      startTime: m.startTime,
      status: m.status,
      homeScore: m.homeScore,
      awayScore: m.awayScore,
      fixtureId: m.fixtureId,
      stage: m.stage,
      tournamentId: m.tournamentId,
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      code: m.code,
      homeAbbr: m.homeTeam?.shortName ?? null,
      awayAbbr: m.awayTeam?.shortName ?? null,
    }));

    const remote = await this.provider.fetchResults(locals);

    const affectedFixtureIds = new Set<string>();
    // Torneos cuya fase de grupos cambió: refrescamos su tabla de posiciones.
    const groupTournamentIds = new Set<string>();
    for (const r of remote) {
      const local = matchRemoteToLocal(locals, r);
      if (!local) continue;
      const becameFinished = await this.applyRemoteResult(local, r);
      if (becameFinished) {
        affectedFixtureIds.add(local.fixtureId);
        if (local.stage === MatchStage.GROUP) {
          groupTournamentIds.add(local.tournamentId);
        } else if (isKnockoutStage(local.stage as unknown as SharedMatchStage)) {
          await this.handleKnockoutFinished({
            fixtureId: local.fixtureId,
            tournamentId: local.tournamentId,
            stage: local.stage,
            code: local.code,
            homeTeamId: local.homeTeamId,
            awayTeamId: local.awayTeamId,
            homeScore: r.homeScore,
            awayScore: r.awayScore,
            homePens: r.homePens ?? null,
            awayPens: r.awayPens ?? null,
          });
        }
      }
    }

    for (const fixtureId of affectedFixtureIds) {
      await this.calculatePoints(fixtureId);
    }

    for (const tournamentId of groupTournamentIds) {
      await this.refreshGroupStandings(tournamentId);
    }

    // Catch-up de llaves: si una ronda ya terminó pero el cruce siguiente aún
    // no se llenó (ESPN suele publicar la llave con unos minutos de retraso),
    // reintentamos el sync este ciclo. Se apaga solo al completarse el cruce.
    if (await this.koHasFillablePendingSide()) {
      try {
        await this.syncKnockoutFromEspn();
      } catch (err: any) {
        this.logger.error(`KO resync catch-up falló: ${err.message}`);
      }
    }
  }

  /**
   * True si existe algún cruce KO con un lado sin definir (teamId null) cuya
   * ronda previa ya terminó por completo — es decir, el cruce YA debería poder
   * resolverse desde ESPN pero todavía no se llenó (típico desfasaje: ESPN
   * tarda unos minutos en publicar la llave siguiente tras cerrarse una ronda).
   * Sirve de guarda para reintentar el sync sin depender de otra transición a
   * FINISHED. Se apaga sola apenas el cruce queda completo.
   */
  private async koHasFillablePendingSide(): Promise<boolean> {
    // Ronda previa de cada ronda KO (la que la alimenta).
    const PREV: Partial<Record<MatchStage, MatchStage>> = {
      [MatchStage.R16]: MatchStage.R32,
      [MatchStage.QUARTERFINAL]: MatchStage.R16,
      [MatchStage.SEMIFINAL]: MatchStage.QUARTERFINAL,
      [MatchStage.THIRD_PLACE]: MatchStage.SEMIFINAL,
      [MatchStage.FINAL]: MatchStage.SEMIFINAL,
    };
    const pending = await this.prisma.match.findMany({
      where: {
        // Solo el torneo activo: syncKnockoutFromEspn() (sin arg) resuelve el
        // activo, así que limitamos el guard a lo que el sync puede llenar. Un
        // torneo histórico con una llave incompleta no debe dispararlo cada ciclo.
        tournament: { isActive: true },
        stage: {
          in: [
            MatchStage.R16,
            MatchStage.QUARTERFINAL,
            MatchStage.SEMIFINAL,
            MatchStage.THIRD_PLACE,
            MatchStage.FINAL,
          ],
        },
        OR: [{ homeTeamId: null }, { awayTeamId: null }],
      },
      select: { stage: true, tournamentId: true },
    });
    for (const m of pending) {
      const prev = PREV[m.stage];
      if (!prev) continue;
      const unfinishedPrev = await this.prisma.match.count({
        where: {
          tournamentId: m.tournamentId,
          stage: prev,
          status: { not: MatchStatus.FINISHED },
        },
      });
      if (unfinishedPrev === 0) return true;
    }
    return false;
  }

  /**
   * Un partido de eliminación quedó FINISHED: propaga el ganador (y perdedor,
   * para el 3er puesto) a las rondas siguientes, y si fue la final dispara el
   * scoring de los picks de campeón. En try/catch: un fallo acá no debe romper
   * el cálculo de puntos del partido.
   */
  private async handleKnockoutFinished(m: FinishedMatchInfo) {
    try {
      // Fuente autoritativa de los cruces KO: ESPN por externalId. Reemplaza a la
      // propagación por placeholders del seed (cableado que no coincide con la
      // llave oficial de FIFA). Ya invalida cache y emite RANKING_UPDATE.
      await this.syncKnockoutFromEspn(m.tournamentId);

      // La final define el campeón → puntuar BracketPicks.
      if (m.stage === MatchStage.FINAL) {
        const winnerSide = knockoutWinnerSide(
          m.homeScore,
          m.awayScore,
          m.homePens,
          m.awayPens,
        );
        const championTeamId =
          winnerSide === 'HOME'
            ? m.homeTeamId
            : winnerSide === 'AWAY'
              ? m.awayTeamId
              : null;
        if (championTeamId) {
          const { scored, usersAffected } =
            await this.tournaments.setTournamentChampion(
              m.tournamentId,
              championTeamId,
            );
          if (scored > 0) {
            this.logger.log(
              `Champion scored: ${scored} bracket picks across ${usersAffected} users`,
            );
            await this.cache.delByPattern('ranking:*');
            this.events.emitToAll(WS_EVENTS.RANKING_UPDATE, {
              tournamentId: m.tournamentId,
            });
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Knockout propagation failed: ${err.message}`);
    }
  }

  /**
   * Cadena post-FINISHED para resultados cargados a mano por el admin
   * (PATCH fixtures/matches/:id): la misma que dispara el poller — puntos del
   * fixture, standings si es grupos, propagación/campeón si es eliminación.
   */
  async onMatchFinished(m: FinishedMatchInfo): Promise<void> {
    await this.calculatePoints(m.fixtureId);
    if (m.stage === MatchStage.GROUP) {
      await this.refreshGroupStandings(m.tournamentId);
    } else if (isKnockoutStage(m.stage as unknown as SharedMatchStage)) {
      await this.handleKnockoutFinished(m);
    }
  }

  /**
   * Refresca GroupStanding del torneo con la tabla oficial del proveedor.
   * Se invoca solo cuando un partido de fase de grupos quedó FINISHED.
   * Mapea cada equipo remoto por abreviatura (ESPN) a Team.shortName local.
   */
  private async refreshGroupStandings(tournamentId: string) {
    if (!this.provider.fetchStandings) return;

    const remoteGroups = await this.provider.fetchStandings();
    if (!remoteGroups.length) return;

    const tts = await this.prisma.tournamentTeam.findMany({
      where: { tournamentId, groupId: { not: null } },
      select: { groupId: true, team: { select: { id: true, shortName: true } } },
    });
    const localByAbbr = new Map<string, { teamId: string; groupId: string }>();
    for (const tt of tts) {
      const abbr = tt.team.shortName?.trim().toLowerCase();
      if (abbr && tt.groupId) {
        localByAbbr.set(abbr, { teamId: tt.team.id, groupId: tt.groupId });
      }
    }

    let updated = 0;
    for (const group of remoteGroups) {
      for (const row of group.teams) {
        const abbr = row.teamAbbr.trim().toLowerCase();
        const local = localByAbbr.get(abbr);
        if (!local) {
          this.logger.warn(
            `Standings: equipo remoto "${row.teamAbbr}" (${group.groupName}) sin match local; skip.`,
          );
          continue;
        }
        const data = {
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goalsFor: row.goalsFor,
          goalsAgainst: row.goalsAgainst,
          goalDiff: row.goalDiff,
          points: row.points,
          position: row.position,
        };
        await this.prisma.groupStanding.upsert({
          where: {
            groupId_teamId: { groupId: local.groupId, teamId: local.teamId },
          },
          create: { tournamentId, groupId: local.groupId, teamId: local.teamId, ...data },
          update: data,
        });
        updated += 1;
      }
    }

    this.logger.log(
      `Standings actualizadas: ${updated} filas (torneo ${tournamentId})`,
    );
    this.events.emitToAll(WS_EVENTS.RANKING_UPDATE, { tournamentId });
  }

  /** Aplica el resultado remoto al match local. Devuelve true si quedó FINISHED por primera vez. */
  private async applyRemoteResult(
    local: { id: string; status: MatchStatus; homeScore: number | null; awayScore: number | null },
    remote: RemoteResult,
  ): Promise<boolean> {
    const newStatus = remote.status;
    const homeScore = remote.homeScore;
    const awayScore = remote.awayScore;

    const updated = await this.prisma.match.update({
      where: { id: local.id },
      data: {
        homeScore: homeScore ?? undefined,
        awayScore: awayScore ?? undefined,
        homeScoreET: remote.homeScoreET ?? undefined,
        awayScoreET: remote.awayScoreET ?? undefined,
        homePens: remote.homePens ?? undefined,
        awayPens: remote.awayPens ?? undefined,
        status: newStatus,
      },
    });

    const scoreChanged =
      local.homeScore !== updated.homeScore || local.awayScore !== updated.awayScore;
    if (scoreChanged && updated.homeScore !== null && updated.awayScore !== null) {
      this.events.emitToAll(WS_EVENTS.MATCH_SCORE_UPDATE, {
        matchId: updated.id,
        homeScore: updated.homeScore,
        awayScore: updated.awayScore,
      });
    }
    if (local.status !== newStatus) {
      this.events.emitToAll(WS_EVENTS.MATCH_STATUS_CHANGE, {
        matchId: updated.id,
        status: newStatus,
      });
    }

    // Cambió un score o el estado del partido: invalidamos fixtures cacheados
    // para que findActive/findUpcoming reflejen el resultado en el próximo GET.
    if (scoreChanged || local.status !== newStatus) {
      await this.cache.delByPattern('fixtures:*');
    }

    const becameFinished =
      local.status !== MatchStatus.FINISHED &&
      newStatus === MatchStatus.FINISHED &&
      homeScore !== null &&
      awayScore !== null;
    return becameFinished;
  }

  async calculatePoints(fixtureId: string) {
    const predictions = await this.prisma.prediction.findMany({
      where: { fixtureId, pointsEarned: null },
      include: { match: true },
    });

    const finished = predictions.filter(
      (p) =>
        p.match.status === MatchStatus.FINISHED &&
        p.match.homeScore !== null &&
        p.match.awayScore !== null,
    );
    if (!finished.length) return;

    const tournamentIdOfFixture = finished[0].match.tournamentId;
    const affectedUserIds = [...new Set(finished.map((p) => p.userId))];

    const memberships = await this.prisma.groupMember.findMany({
      where: { userId: { in: affectedUserIds } },
      select: { userId: true, groupId: true },
    });
    const affectedGroupIds = [...new Set(memberships.map((m) => m.groupId))];
    const beforePositions = await this.snapshotPositions(
      affectedGroupIds,
      tournamentIdOfFixture,
    );

    const pointsByUser = new Map<string, number>();
    // Una notificación por cada partido finalizado, con frase variada según
    // el resultado del pronóstico del usuario.
    const matchNotifications: {
      userId: string;
      type: NotificationType;
      message: string;
      payload: Prisma.InputJsonValue;
    }[] = [];

    // ── Fase 1: cómputo en memoria (CPU puro, sin I/O) ────────────────────
    // Puntuamos cada predicción y, en paralelo, armamos las notificaciones por
    // partido (dependen de datos del match, por eso no salen de la función pura).
    const scored: ScoredPredictionInput[] = [];
    for (const pred of finished) {
      const { homeScore, awayScore } = pred.match;
      // En eliminación se puntúa por "quién avanza" (con penales) + marcador
      // exacto; en grupos, por resultado + exacto. Ver scoring.ts.
      const outcome = isKnockoutStage(
        pred.match.stage as unknown as SharedMatchStage,
      )
        ? computeKnockoutOutcome(pred, {
            homeScore: homeScore!,
            awayScore: awayScore!,
            homePens: pred.match.homePens,
            awayPens: pred.match.awayPens,
          })
        : computePredictionOutcome(pred, {
            homeScore: homeScore!,
            awayScore: awayScore!,
          });
      scored.push({
        userId: pred.userId,
        predictionId: pred.id,
        createdAt: pred.createdAt,
        outcome,
      });

      const matchPhrase = matchResultPhrase({
        homeTeamName: pred.match.homeTeamName,
        awayTeamName: pred.match.awayTeamName,
        points: outcome.points,
        exactScore: outcome.exactScore === 1,
        correctWinner: outcome.correctWinner === 1,
        seed: pred.id,
      });
      matchNotifications.push({
        userId: pred.userId,
        type: NotificationType.RESULT_CALCULATED,
        message: matchPhrase.fallback,
        payload: { key: matchPhrase.key, params: matchPhrase.params },
      });

      pointsByUser.set(pred.userId, (pointsByUser.get(pred.userId) ?? 0) + outcome.points);
    }

    // Agregación pura (testeada en scoring.spec.ts): delta por usuario + buckets.
    const { deltaByUser, predIdsByPoints } = aggregateScoredPredictions(scored);

    // ── Fase 2: escritura batcheada (pocas queries, set-based) ────────────
    // 2a. pointsEarned de las predicciones: un updateMany por valor de puntos
    // distinto (típicamente {0,1,2,3,5}), en vez de un update por predicción.
    await this.prisma.$transaction(
      [...predIdsByPoints.entries()].map(([points, ids]) =>
        this.prisma.prediction.updateMany({
          where: { id: { in: ids } },
          data: { pointsEarned: points },
        }),
      ),
    );

    // 2b. UserScore y GroupScore: un upsert agregado por usuario/grupo vía SQL
    // (INSERT ... ON CONFLICT DO UPDATE). Ver applyScoreDeltas().
    await this.applyScoreDeltas(deltaByUser, memberships, tournamentIdOfFixture);

    const afterPositions = await this.snapshotPositions(
      affectedGroupIds,
      tournamentIdOfFixture,
    );

    const users = await this.prisma.user.findMany({
      where: { id: { in: affectedUserIds } },
      select: { id: true, username: true },
    });
    const usernameById = new Map(users.map((u) => [u.id, u.username]));

    // ¿Esta fue la última fecha del día? Si no quedan partidos por jugar hoy,
    // emitimos el resumen diario con el total y la posición global.
    const isEndOfDay = await this.noMoreMatchesToday(tournamentIdOfFixture);
    const globalPositions = isEndOfDay
      ? await this.globalPositions(tournamentIdOfFixture)
      : new Map<string, number>();

    for (const userId of affectedUserIds) {
      const points = pointsByUser.get(userId) ?? 0;
      const username = usernameById.get(userId) ?? 'Alguien';
      const userMemberships = memberships.filter((m) => m.userId === userId);

      for (const m of userMemberships) {
        if (points > 0) {
          await this.activity.emit({
            groupId: m.groupId,
            userId,
            type: ActivityType.POINTS_EARNED,
            message: `${username} sumó ${points} pts en la última fecha`,
            payload: { fixtureId, points },
          });
        }
        const before = beforePositions.get(`${m.groupId}|${userId}`);
        const after = afterPositions.get(`${m.groupId}|${userId}`);
        if (before && after && after < before) {
          await this.activity.emit({
            groupId: m.groupId,
            userId,
            type: ActivityType.RANK_UP,
            message: `${username} subió al puesto #${after}`,
            payload: { from: before, to: after },
          });
        }
      }

      await this.gamificacion.evaluateAchievements(userId);

      if (isEndOfDay) {
        const summary = dailySummaryPhrase({
          points,
          position: globalPositions.get(userId) ?? null,
          seed: `${fixtureId}|${userId}`,
        });
        matchNotifications.push({
          userId,
          type: NotificationType.RANKING_CHANGE,
          message: summary.fallback,
          payload: { key: summary.key, params: summary.params },
        });
      }
    }

    // Notificaciones por partido + resumen diario, en un solo batch.
    await this.notificaciones.createMany(matchNotifications);

    // Los scores cambiaron: invalidamos el ranking cacheado antes de avisar a
    // los clientes para que el refetch que dispara RANKING_UPDATE traiga datos
    // frescos y no la versión cacheada vieja.
    await this.cache.delByPattern('ranking:*');

    this.events.emitToAll(WS_EVENTS.RANKING_UPDATE, {
      fixtureId,
      tournamentId: tournamentIdOfFixture,
    });

    for (const groupId of affectedGroupIds) {
      this.events.emitToGroup(groupId, WS_EVENTS.RANKING_UPDATE, { groupId });
    }

    this.logger.log(
      `Calculated points for ${finished.length} predictions in fixture ${fixtureId}`,
    );

    // Si esta fixture es la 3ra fecha de grupos y ya están todos los partidos
    // de grupos terminados, puntuamos los picks de clasificados a R32.
    const fixtureMeta = await this.prisma.fixture.findUnique({
      where: { id: fixtureId },
      select: { round: true, tournamentId: true },
    });
    if (fixtureMeta?.round === 3) {
      // Rellenar las llaves de R32 con los clasificados reales (TOP2 automático;
      // terceros solo si el admin ya confirmó). En su propio try/catch: si falla
      // el relleno, el scoring de abajo igual debe correr.
      try {
        const { filledTop, thirdsPending } =
          await this.tournaments.fillR32Matches(fixtureMeta.tournamentId);
        if (filledTop > 0) {
          this.logger.log(
            `R32 bracket filled: ${filledTop} sides${thirdsPending ? ' (terceros pendientes de confirmación admin)' : ''}`,
          );
          await this.cache.delByPattern('fixtures:*');
          this.events.emitToAll(WS_EVENTS.RANKING_UPDATE, {
            tournamentId: fixtureMeta.tournamentId,
          });
        }
      } catch (err: any) {
        this.logger.error(`R32 bracket fill failed: ${err.message}`);
      }

      // Puntuar los picks de clasificados a R32 (independiente del relleno).
      try {
        const { scored, usersAffected } =
          await this.tournaments.scoreR32PicksIfReady(fixtureMeta.tournamentId);
        if (scored > 0) {
          this.logger.log(
            `R32 picks scored: ${scored} picks across ${usersAffected} users`,
          );
          await this.cache.delByPattern('ranking:*');
          this.events.emitToAll(WS_EVENTS.RANKING_UPDATE, {
            tournamentId: fixtureMeta.tournamentId,
          });
        }
      } catch (err: any) {
        this.logger.error(`R32 scoring failed: ${err.message}`);
      }
    }
  }

  /**
   * Máximos goleadores del torneo (del proveedor), mapeados a nuestros equipos
   * para mostrar bandera + nombre localizado. Cacheado 10 min para no pegarle
   * al proveedor en cada visita al home. Si el provider no expone goleadores o
   * falla, devuelve [].
   */
  async getTopScorers(limit = 5): Promise<
    Array<{
      name: string;
      goals: number;
      played: number | null;
      photoUrl: string | null;
      teamName: string | null;
      teamShortName: string | null;
      flagUrl: string | null;
    }>
  > {
    if (!this.provider.fetchTopScorers) return [];
    return this.cache.wrap(`top-scorers:${limit}`, 600, async () => {
      const remote = await this.provider.fetchTopScorers!(limit);
      if (!remote.length) return [];

      // Mapear abreviaturas a nuestros equipos (bandera + nombre localizado).
      const abbrs = [...new Set(remote.map((s) => s.teamAbbr).filter(Boolean) as string[])];
      const teams = abbrs.length
        ? await this.prisma.team.findMany({
            where: { shortName: { in: abbrs } },
            select: { name: true, shortName: true, flagUrl: true },
          })
        : [];
      const byAbbr = new Map(
        teams.map((t) => [t.shortName?.toLowerCase() ?? '', t]),
      );

      return remote.map((s) => {
        const local = s.teamAbbr ? byAbbr.get(s.teamAbbr.toLowerCase()) : undefined;
        return {
          name: s.name,
          goals: s.goals,
          played: s.played,
          photoUrl: s.photoUrl,
          teamName: local?.name ?? s.teamName,
          teamShortName: local?.shortName ?? s.teamAbbr,
          flagUrl: local?.flagUrl ?? null,
        };
      });
    });
  }

  /**
   * Sincroniza los equipos de los cruces de R32 desde el proveedor (ESPN),
   * que ya tiene las llaves cerradas y oficiales. Resuelve tanto los mejores
   * terceros como cualquier slot mal asignado por el cómputo interno. Adopta la
   * orientación local/visitante del proveedor (lo que ve el usuario en ESPN).
   *
   * Mapea la abreviatura del proveedor a nuestro Team por shortName. Marca el
   * torneo como r32ThirdsConfirmed=true (llaves publicadas). Idempotente.
   */
  async syncR32FromEspn(
    tournamentId?: string,
  ): Promise<{ updated: number; unmapped: string[]; tournamentId: string | null }> {
    const tid =
      tournamentId ??
      (await this.prisma.tournament.findFirst({ where: { isActive: true }, select: { id: true } }))?.id ??
      null;
    if (!tid) return { updated: 0, unmapped: [], tournamentId: null };

    const matches = await this.prisma.match.findMany({
      where: { tournamentId: tid, stage: MatchStage.R32 },
      select: {
        id: true,
        externalId: true,
        startTime: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });
    const active = matches
      .filter((m) => m.externalId)
      .map((m) => ({ id: m.id, externalId: m.externalId!, startTime: m.startTime }));
    if (!active.length) return { updated: 0, unmapped: [], tournamentId: tid };

    const remote = await this.provider.fetchResults(active);
    const byExt = new Map(remote.map((r) => [r.externalId, r]));

    const abbrs = new Set<string>();
    for (const r of remote) {
      if (r.homeAbbr) abbrs.add(r.homeAbbr);
      if (r.awayAbbr) abbrs.add(r.awayAbbr);
    }
    const teams = await this.prisma.team.findMany({
      where: { shortName: { in: [...abbrs] } },
      select: { id: true, name: true, shortName: true },
    });
    const byAbbr = new Map(teams.map((t) => [t.shortName?.toLowerCase() ?? '', t]));

    const unmapped = new Set<string>();
    let updated = 0;
    for (const m of matches) {
      const r = m.externalId ? byExt.get(m.externalId) : undefined;
      if (!r || !r.homeAbbr || !r.awayAbbr) continue;
      const h = byAbbr.get(r.homeAbbr.toLowerCase());
      const a = byAbbr.get(r.awayAbbr.toLowerCase());
      if (!h) unmapped.add(r.homeAbbr);
      if (!a) unmapped.add(r.awayAbbr);
      if (!h || !a) continue;
      if (m.homeTeamId === h.id && m.awayTeamId === a.id) continue;
      await this.prisma.match.update({
        where: { id: m.id },
        data: {
          homeTeamId: h.id,
          homeTeamName: h.name,
          awayTeamId: a.id,
          awayTeamName: a.name,
        },
      });
      updated += 1;
    }

    await this.prisma.tournament.update({
      where: { id: tid },
      data: { r32ThirdsConfirmed: true },
    });

    await this.cache.delByPattern('fixtures:*');
    this.events.emitToAll(WS_EVENTS.RANKING_UPDATE, { tournamentId: tid });

    return { updated, unmapped: [...unmapped], tournamentId: tid };
  }

  /**
   * Sincronización AUTORITATIVA de los cruces de TODAS las rondas de eliminación
   * desde el proveedor (ESPN), matcheando cada partido por su `externalId` (que
   * en KO es el event id real de ESPN). Reemplaza a la propagación por
   * placeholders del seed (que dependía de un cableado de llaves que NO coincide
   * con la llave oficial de FIFA, por lo que era poco confiable).
   *
   * Por cada lado (local/visitante), SOLO escribe un equipo cuando ESPN provee un
   * equipo real para ese lado (abreviatura presente y mapeable a un Team). Si el
   * lado de ESPN sigue siendo un placeholder pendiente (sin abreviatura, p.ej.
   * "Round of 32 15 Winner"), NO toca ese lado en la DB: se preserva nuestro
   * placeholder y jamás se escribe la etiqueta en inglés de ESPN. Adopta la
   * orientación local/visitante del proveedor para los lados que sí resuelve.
   *
   * Idempotente: solo actualiza un lado cuando el equipo resuelto difiere del
   * actual. Mapea abreviatura → Team por shortName (case-insensitive).
   */
  async syncKnockoutFromEspn(
    tournamentId?: string,
  ): Promise<{ updated: number; unmapped: string[]; tournamentId: string | null }> {
    const tid =
      tournamentId ??
      (await this.prisma.tournament.findFirst({ where: { isActive: true }, select: { id: true } }))?.id ??
      null;
    if (!tid) return { updated: 0, unmapped: [], tournamentId: null };

    const KO_STAGES = [
      MatchStage.R32,
      MatchStage.R16,
      MatchStage.QUARTERFINAL,
      MatchStage.SEMIFINAL,
      MatchStage.THIRD_PLACE,
      MatchStage.FINAL,
    ];

    const matches = await this.prisma.match.findMany({
      where: { tournamentId: tid, stage: { in: KO_STAGES } },
      select: {
        id: true,
        externalId: true,
        startTime: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });
    const active = matches
      .filter((m) => m.externalId)
      .map((m) => ({ id: m.id, externalId: m.externalId!, startTime: m.startTime }));
    if (!active.length) return { updated: 0, unmapped: [], tournamentId: tid };

    const remote = await this.provider.fetchResults(active);
    const byExt = new Map(remote.map((r) => [r.externalId, r]));

    const abbrs = new Set<string>();
    for (const r of remote) {
      if (r.homeAbbr) abbrs.add(r.homeAbbr);
      if (r.awayAbbr) abbrs.add(r.awayAbbr);
    }
    const teams = await this.prisma.team.findMany({
      where: { shortName: { in: [...abbrs] } },
      select: { id: true, name: true, shortName: true },
    });
    const byAbbr = new Map(teams.map((t) => [t.shortName?.toLowerCase() ?? '', t]));

    const unmapped = new Set<string>();
    let updated = 0;
    for (const m of matches) {
      const r = m.externalId ? byExt.get(m.externalId) : undefined;
      if (!r) continue;

      // Resolvemos cada lado de forma independiente: solo escribimos un lado
      // cuando ESPN trae una abreviatura real que mapea a un Team nuestro. Un
      // lado sin abreviatura (placeholder pendiente) se deja intacto.
      const h = r.homeAbbr ? byAbbr.get(r.homeAbbr.toLowerCase()) : undefined;
      const a = r.awayAbbr ? byAbbr.get(r.awayAbbr.toLowerCase()) : undefined;
      if (r.homeAbbr && !h) unmapped.add(r.homeAbbr);
      if (r.awayAbbr && !a) unmapped.add(r.awayAbbr);

      const data: Prisma.MatchUncheckedUpdateInput = {};
      if (h && m.homeTeamId !== h.id) {
        data.homeTeamId = h.id;
        data.homeTeamName = h.name;
      }
      if (a && m.awayTeamId !== a.id) {
        data.awayTeamId = a.id;
        data.awayTeamName = a.name;
      }
      if (Object.keys(data).length === 0) continue;

      await this.prisma.match.update({ where: { id: m.id }, data });
      updated += 1;
    }

    await this.cache.delByPattern('fixtures:*');
    this.events.emitToAll(WS_EVENTS.RANKING_UPDATE, { tournamentId: tid });

    return { updated, unmapped: [...unmapped], tournamentId: tid };
  }

  private async snapshotPositions(groupIds: string[], tournamentId: string) {
    if (!groupIds.length) return new Map<string, number>();
    const scores = await this.prisma.groupScore.findMany({
      where: { groupId: { in: groupIds }, tournamentId },
      orderBy: [
        { total: 'desc' },
        { correctWinners: 'desc' },
        { exactScores: 'desc' },
        { exactGoalsSum: 'desc' },
        { firstPredictionAt: 'asc' },
      ],
      select: { groupId: true, userId: true },
    });
    const positions = new Map<string, number>();
    const counters = new Map<string, number>();
    for (const s of scores) {
      const pos = (counters.get(s.groupId) ?? 0) + 1;
      counters.set(s.groupId, pos);
      positions.set(`${s.groupId}|${s.userId}`, pos);
    }
    return positions;
  }

  /**
   * True si no quedan más partidos por jugarse "hoy" en el torneo: ningún
   * partido PENDING o LIVE con kickoff dentro del día actual. Sirve para emitir
   * el resumen diario al cerrar la última fecha de la jornada.
   *
   * El "día" se calcula en la zona horaria canónica del producto (la misma que
   * usa el front para formatear), no en la del servidor, para que la jornada no
   * se parta al cruzar la medianoche UTC.
   */
  private async noMoreMatchesToday(tournamentId: string): Promise<boolean> {
    const { start, end } = this.dayRangeInTz(new Date(), PRODUCT_TIME_ZONE);

    const pending = await this.prisma.match.count({
      where: {
        tournamentId,
        startTime: { gte: start, lt: end },
        status: { in: [MatchStatus.PENDING, MatchStatus.LIVE] },
      },
    });
    return pending === 0;
  }

  /** Rango [inicio, fin) del día (en `timeZone`) que contiene a `at`, como UTC. */
  private dayRangeInTz(at: Date, timeZone: string): { start: Date; end: Date } {
    // Partes de la fecha en la zona objetivo (año/mes/día locales).
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(at);
    const get = (type: string) => parts.find((p) => p.type === type)?.value;
    const ymd = `${get('year')}-${get('month')}-${get('day')}`;

    // Offset de la zona respecto a UTC en ese instante (ej. "-03:00").
    const offset = this.tzOffset(at, timeZone);
    const start = new Date(`${ymd}T00:00:00.000${offset}`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    return { start, end };
  }

  /** Offset "+HH:MM" / "-HH:MM" de `timeZone` respecto a UTC en el instante `at`. */
  private tzOffset(at: Date, timeZone: string): string {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'longOffset',
    });
    const name = dtf
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    // name viene como "GMT-03:00"; si no, asumimos UTC.
    const match = name?.match(/GMT([+-]\d{2}:\d{2})/);
    return match ? match[1] : '+00:00';
  }

  /** Posición global (1-based) de cada usuario en el torneo, mismo orden que el ranking. */
  private async globalPositions(
    tournamentId: string,
  ): Promise<Map<string, number>> {
    const scores = await this.prisma.userScore.findMany({
      where: { tournamentId },
      orderBy: [
        { total: 'desc' },
        { correctWinners: 'desc' },
        { exactScores: 'desc' },
        { exactGoalsSum: 'desc' },
        { firstPredictionAt: 'asc' },
      ],
      select: { userId: true },
    });
    const positions = new Map<string, number>();
    scores.forEach((s, idx) => positions.set(s.userId, idx + 1));
    return positions;
  }

  /**
   * Aplica los deltas agregados a UserScore y GroupScore con UN solo INSERT
   * ... ON CONFLICT DO UPDATE por tabla, en vez de un findUnique+update por
   * (usuario [× grupo]). Reemplaza a los antiguos updateUserScore /
   * updateGroupScores que corrían query-por-fila dentro de un loop.
   *
   * Nota sobre `streak`: la versión anterior lo incrementaba +1 por cada
   * predicción acertada (>0 pts) y lo reseteaba a 0 ante una fallada, en el
   * orden de iteración. Lo preservamos así: si TODAS las predicciones del
   * usuario en este batch sumaron, encadenamos (`streak + positiveCount`); si
   * alguna falló, el racha se corta y queda en los aciertos posteriores al
   * último fallo. Como dentro de un mismo batch no conocemos el orden relativo
   * de forma estable, usamos la convención: hubo algún fallo ⇒ streak = aciertos
   * de este batch; sin fallos ⇒ streak previo + aciertos.
   */
  private async applyScoreDeltas(
    deltaByUser: Map<
      string,
      {
        points: number;
        correctWinners: number;
        exactScores: number;
        exactGoalsSum: number;
        positiveCount: number;
        firstPredictionAt: Date;
      }
    >,
    memberships: { userId: string; groupId: string }[],
    tournamentId: string,
  ) {
    if (!deltaByUser.size) return;

    const userValues = [...deltaByUser.entries()].map(([userId, d]) => ({
      userId,
      d,
    }));

    await this.prisma.$transaction(async (tx) => {
      // UserScore
      await tx.$executeRaw`
        INSERT INTO "UserScore"
          ("id","userId","tournamentId","total","streak","correctWinners","exactScores","exactGoalsSum","firstPredictionAt")
        SELECT
          gen_random_uuid()::text, v."userId", ${tournamentId},
          v.total, CASE WHEN v.positive_count > 0 THEN 1 ELSE 0 END,
          v."correctWinners", v."exactScores", v."exactGoalsSum", v.first_at
        FROM jsonb_to_recordset(${JSON.stringify(
          userValues.map(({ userId, d }) => ({
            userId,
            total: d.points,
            correctWinners: d.correctWinners,
            exactScores: d.exactScores,
            exactGoalsSum: d.exactGoalsSum,
            positive_count: d.positiveCount,
            first_at: d.firstPredictionAt.toISOString(),
          })),
        )}::jsonb) AS v(
          "userId" text, total int, "correctWinners" int, "exactScores" int,
          "exactGoalsSum" int, positive_count int, first_at timestamptz
        )
        ON CONFLICT ("userId","tournamentId") DO UPDATE SET
          total = "UserScore".total + EXCLUDED.total,
          "correctWinners" = "UserScore"."correctWinners" + EXCLUDED."correctWinners",
          "exactScores" = "UserScore"."exactScores" + EXCLUDED."exactScores",
          "exactGoalsSum" = "UserScore"."exactGoalsSum" + EXCLUDED."exactGoalsSum",
          streak = EXCLUDED.streak,
          "firstPredictionAt" = LEAST("UserScore"."firstPredictionAt", EXCLUDED."firstPredictionAt")
      `;

      // ── GroupScore: una fila por (usuario × grupo) ──────────────────────
      const groupRows: {
        groupId: string;
        userId: string;
        total: number;
        correctWinners: number;
        exactScores: number;
        exactGoalsSum: number;
        positive_count: number;
        first_at: string;
      }[] = [];
      for (const m of memberships) {
        const d = deltaByUser.get(m.userId);
        if (!d) continue;
        groupRows.push({
          groupId: m.groupId,
          userId: m.userId,
          total: d.points,
          correctWinners: d.correctWinners,
          exactScores: d.exactScores,
          exactGoalsSum: d.exactGoalsSum,
          positive_count: d.positiveCount,
          first_at: d.firstPredictionAt.toISOString(),
        });
      }
      if (groupRows.length) {
        await tx.$executeRaw`
          INSERT INTO "GroupScore"
            ("id","groupId","userId","tournamentId","total","streak","correctWinners","exactScores","exactGoalsSum","firstPredictionAt")
          SELECT
            gen_random_uuid()::text, v."groupId", v."userId", ${tournamentId},
            v.total, CASE WHEN v.positive_count > 0 THEN 1 ELSE 0 END,
            v."correctWinners", v."exactScores", v."exactGoalsSum", v.first_at
          FROM jsonb_to_recordset(${JSON.stringify(groupRows)}::jsonb) AS v(
            "groupId" text, "userId" text, total int, "correctWinners" int,
            "exactScores" int, "exactGoalsSum" int, positive_count int, first_at timestamptz
          )
          ON CONFLICT ("groupId","userId","tournamentId") DO UPDATE SET
            total = "GroupScore".total + EXCLUDED.total,
            "correctWinners" = "GroupScore"."correctWinners" + EXCLUDED."correctWinners",
            "exactScores" = "GroupScore"."exactScores" + EXCLUDED."exactScores",
            "exactGoalsSum" = "GroupScore"."exactGoalsSum" + EXCLUDED."exactGoalsSum",
            streak = EXCLUDED.streak,
            "firstPredictionAt" = LEAST("GroupScore"."firstPredictionAt", EXCLUDED."firstPredictionAt")
        `;
      }
    });
  }
}
