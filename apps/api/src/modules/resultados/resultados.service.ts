import { Injectable, Logger } from '@nestjs/common';
import { MatchStatus, NotificationType, Result } from '@prisma/client';
import axios from 'axios';
import { WS_EVENTS } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { GamificacionService } from '../gamificacion/gamificacion.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { statusFromApiFootball } from '../../common/utils/api-football.util';
import {
  POINTS_CORRECT_RESULT,
  POINTS_EXACT_SCORE,
  CAPTAIN_MULTIPLIER,
} from '@prode/shared';

interface ApiFixtureResponse {
  fixture: { id: number; status: { short: string } };
  goals: { home: number | null; away: number | null };
  score: {
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

// Chunk para que la URL no se desborde si hay muchísimos partidos activos.
const BATCH_SIZE = 20;

@Injectable()
export class ResultadosService {
  private readonly logger = new Logger(ResultadosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificacion: GamificacionService,
    private readonly notificaciones: NotificacionesService,
    private readonly events: EventsGateway,
  ) {}

  async fetchAndUpdateResults() {
    const apiKey = process.env.SPORTS_API_KEY;
    const rawUrl = process.env.SPORTS_API_URL;
    if (!apiKey || !rawUrl) {
      this.logger.warn('SPORTS_API_KEY/SPORTS_API_URL no configurados. Skipping.');
      return;
    }
    const apiUrl = (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).replace(/\/+$/, '');

    const activeMatches = await this.prisma.match.findMany({
      where: {
        status: { in: [MatchStatus.LIVE, MatchStatus.PENDING] },
        externalId: { not: null },
      },
    });
    if (!activeMatches.length) return;

    const matchByExternalId = new Map(activeMatches.map((m) => [m.externalId!, m]));
    const externalIds = activeMatches.map((m) => m.externalId!);

    const affectedFixtureIds = new Set<string>();

    for (let i = 0; i < externalIds.length; i += BATCH_SIZE) {
      const chunk = externalIds.slice(i, i + BATCH_SIZE);
      try {
        const res = await axios.get(`${apiUrl}/fixtures`, {
          headers: { 'x-apisports-key': apiKey },
          params: { ids: chunk.join('-') },
          timeout: 10_000,
        });
        const responses: ApiFixtureResponse[] = res.data?.response ?? [];
        for (const fx of responses) {
          const local = matchByExternalId.get(String(fx.fixture.id));
          if (!local) continue;
          const fixtureChanged = await this.applyRemoteResult(local, fx);
          if (fixtureChanged) affectedFixtureIds.add(local.fixtureId);
        }
      } catch (err: any) {
        this.logger.error(`Batch fetch failed: ${err.message}`);
      }
    }

    for (const fixtureId of affectedFixtureIds) {
      await this.calculatePoints(fixtureId);
    }
  }

  /** Aplica el resultado remoto al match local. Devuelve true si quedó FINISHED por primera vez. */
  private async applyRemoteResult(
    local: { id: string; status: MatchStatus; homeScore: number | null; awayScore: number | null },
    remote: ApiFixtureResponse,
  ): Promise<boolean> {
    const newStatus = statusFromApiFootball(remote.fixture.status.short);
    const homeScore = remote.goals.home ?? null;
    const awayScore = remote.goals.away ?? null;

    const updated = await this.prisma.match.update({
      where: { id: local.id },
      data: {
        homeScore: homeScore ?? undefined,
        awayScore: awayScore ?? undefined,
        homeScoreET: remote.score.extratime.home ?? undefined,
        awayScoreET: remote.score.extratime.away ?? undefined,
        homePens: remote.score.penalty.home ?? undefined,
        awayPens: remote.score.penalty.away ?? undefined,
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

    const affectedUsers = new Set<string>();
    let tournamentIdOfFixture: string | null = null;

    for (const pred of finished) {
      const { homeScore, awayScore } = pred.match;
      tournamentIdOfFixture = pred.match.tournamentId;

      let actualResult: Result;
      if (homeScore! > awayScore!) actualResult = Result.HOME;
      else if (homeScore! < awayScore!) actualResult = Result.AWAY;
      else actualResult = Result.DRAW;

      let points = 0;
      if (pred.result === actualResult) {
        points += POINTS_CORRECT_RESULT;
        if (pred.homeScoreGuess === homeScore && pred.awayScoreGuess === awayScore) {
          points += POINTS_EXACT_SCORE;
        }
      }
      if (pred.isCaptain) points *= CAPTAIN_MULTIPLIER;

      await this.prisma.prediction.update({
        where: { id: pred.id },
        data: { pointsEarned: points },
      });

      await this.updateGroupScores(pred.userId, points, pred.match.tournamentId);
      affectedUsers.add(pred.userId);
    }

    for (const userId of affectedUsers) {
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

    const affectedGroups = await this.prisma.groupMember.findMany({
      where: { userId: { in: [...affectedUsers] } },
      select: { groupId: true },
      distinct: ['groupId'],
    });
    for (const g of affectedGroups) {
      this.events.emitToGroup(g.groupId, WS_EVENTS.RANKING_UPDATE, {
        groupId: g.groupId,
      });
    }

    this.logger.log(
      `Calculated points for ${finished.length} predictions in fixture ${fixtureId}`,
    );
  }

  private async updateGroupScores(userId: string, points: number, tournamentId: string) {
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
        const newStreak = points > 0 ? existing.streak + 1 : 0;
        await this.prisma.groupScore.update({
          where: { id: existing.id },
          data: { total: existing.total + points, streak: newStreak },
        });
      } else {
        await this.prisma.groupScore.create({
          data: {
            userId,
            groupId: membership.groupId,
            tournamentId,
            total: points,
            streak: points > 0 ? 1 : 0,
          },
        });
      }
    }
  }
}
