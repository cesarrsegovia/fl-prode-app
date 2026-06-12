import { Injectable, Logger, Inject } from '@nestjs/common';
import { ActivityType, MatchStatus, NotificationType, Result } from '@prisma/client';
import { WS_EVENTS } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { GamificacionService } from '../gamificacion/gamificacion.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { ActivityService } from '../activity/activity.service';
import { TournamentsService } from '../tournaments/tournaments.service';
import {
  ActiveMatch,
  RemoteResult,
  RESULTS_PROVIDER,
  ResultsProvider,
} from './providers/results-provider';
import { computePredictionOutcome } from './scoring';

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
      },
    });
    if (!activeMatches.length) return;

    const byExternalId = new Map(activeMatches.map((m) => [m.externalId!, m]));
    const active: ActiveMatch[] = activeMatches.map((m) => ({
      id: m.id,
      externalId: m.externalId!,
      startTime: m.startTime,
    }));

    const remote = await this.provider.fetchResults(active);

    const affectedFixtureIds = new Set<string>();
    for (const r of remote) {
      const local = byExternalId.get(r.externalId);
      if (!local) continue;
      const becameFinished = await this.applyRemoteResult(local, r);
      if (becameFinished) affectedFixtureIds.add(local.fixtureId);
    }

    for (const fixtureId of affectedFixtureIds) {
      await this.calculatePoints(fixtureId);
    }
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

    for (const pred of finished) {
      const { homeScore, awayScore } = pred.match;
      const outcome = computePredictionOutcome(pred, {
        homeScore: homeScore!,
        awayScore: awayScore!,
      });

      await this.prisma.prediction.update({
        where: { id: pred.id },
        data: { pointsEarned: outcome.points },
      });

      await this.updateGroupScores(
        pred.userId,
        {
          points: outcome.points,
          correctWinners: outcome.correctWinner,
          exactScores: outcome.exactScore,
          exactGoalsSum: outcome.exactGoals,
        },
        pred.match.tournamentId,
        pred.createdAt,
      );
      pointsByUser.set(pred.userId, (pointsByUser.get(pred.userId) ?? 0) + outcome.points);
    }

    const afterPositions = await this.snapshotPositions(
      affectedGroupIds,
      tournamentIdOfFixture,
    );

    const users = await this.prisma.user.findMany({
      where: { id: { in: affectedUserIds } },
      select: { id: true, username: true },
    });
    const usernameById = new Map(users.map((u) => [u.id, u.username]));

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
      await this.notificaciones.create(
        userId,
        NotificationType.RESULT_CALCULATED,
        'Se calcularon tus puntos de la última fecha.',
      );
    }

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
      try {
        const { scored, usersAffected } =
          await this.tournaments.scoreR32PicksIfReady(fixtureMeta.tournamentId);
        if (scored > 0) {
          this.logger.log(
            `R32 picks scored: ${scored} picks across ${usersAffected} users`,
          );
          this.events.emitToAll(WS_EVENTS.RANKING_UPDATE, {
            tournamentId: fixtureMeta.tournamentId,
          });
        }
      } catch (err: any) {
        this.logger.error(`R32 scoring failed: ${err.message}`);
      }
    }
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

  private async updateGroupScores(
    userId: string,
    delta: { points: number; correctWinners: number; exactScores: number; exactGoalsSum: number },
    tournamentId: string,
    predictionCreatedAt: Date,
  ) {
    const memberships = await this.prisma.groupMember.findMany({ where: { userId } });
    for (const membership of memberships) {
      const existing = await this.prisma.groupScore.findUnique({
        where: {
          groupId_userId_tournamentId: {
            groupId: membership.groupId,
            userId,
            tournamentId,
          },
        },
      });
      if (existing) {
        const newStreak = delta.points > 0 ? existing.streak + 1 : 0;
        const firstPredictionAt =
          !existing.firstPredictionAt || predictionCreatedAt < existing.firstPredictionAt
            ? predictionCreatedAt
            : existing.firstPredictionAt;
        await this.prisma.groupScore.update({
          where: { id: existing.id },
          data: {
            total: existing.total + delta.points,
            streak: newStreak,
            correctWinners: existing.correctWinners + delta.correctWinners,
            exactScores: existing.exactScores + delta.exactScores,
            exactGoalsSum: existing.exactGoalsSum + delta.exactGoalsSum,
            firstPredictionAt,
          },
        });
      } else {
        await this.prisma.groupScore.create({
          data: {
            userId,
            groupId: membership.groupId,
            tournamentId,
            total: delta.points,
            streak: delta.points > 0 ? 1 : 0,
            correctWinners: delta.correctWinners,
            exactScores: delta.exactScores,
            exactGoalsSum: delta.exactGoalsSum,
            firstPredictionAt: predictionCreatedAt,
          },
        });
      }
    }
  }
}
