import { Injectable, Logger } from '@nestjs/common';
import { MatchStatus, Result } from '@prisma/client';
import axios from 'axios';
import { PrismaService } from '../../prisma/prisma.service';
import { GamificacionService } from '../gamificacion/gamificacion.service';
import {
  POINTS_CORRECT_RESULT,
  POINTS_EXACT_SCORE,
  CAPTAIN_MULTIPLIER,
} from '@prode/shared';

@Injectable()
export class ResultadosService {
  private readonly logger = new Logger(ResultadosService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificacion: GamificacionService,
  ) {}

  async fetchAndUpdateResults() {
    const apiKey = process.env.SPORTS_API_KEY;
    const apiUrl = process.env.SPORTS_API_URL;

    if (!apiKey || !apiUrl) {
      this.logger.warn('SPORTS_API_KEY/SPORTS_API_URL not configured. Skipping.');
      return;
    }

    const activeMatches = await this.prisma.match.findMany({
      where: { status: { in: [MatchStatus.LIVE, MatchStatus.PENDING] } },
    });

    if (!activeMatches.length) return;

    for (const match of activeMatches) {
      try {
        const res = await axios.get(`${apiUrl}/fixtures`, {
          headers: { 'x-apisports-key': apiKey },
          params: { id: match.id },
          timeout: 5000,
        });

        const fixtureData = res.data?.response?.[0];
        if (!fixtureData) continue;

        const homeScore: number | null = fixtureData.goals?.home ?? null;
        const awayScore: number | null = fixtureData.goals?.away ?? null;
        const statusShort: string = fixtureData.fixture?.status?.short ?? '';

        let newStatus: MatchStatus;
        if (statusShort === 'FT' || statusShort === 'AET' || statusShort === 'PEN') {
          newStatus = MatchStatus.FINISHED;
        } else if (['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(statusShort)) {
          newStatus = MatchStatus.LIVE;
        } else {
          newStatus = MatchStatus.PENDING;
        }

        await this.prisma.match.update({
          where: { id: match.id },
          data: {
            homeScore: homeScore ?? undefined,
            awayScore: awayScore ?? undefined,
            status: newStatus,
          },
        });

        if (newStatus === MatchStatus.FINISHED && homeScore !== null && awayScore !== null) {
          await this.calculatePoints(match.fixtureId);
        }
      } catch (err: any) {
        this.logger.error(`Failed to fetch result for match ${match.id}: ${err.message}`);
      }
    }
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

    for (const pred of finished) {
      const { homeScore, awayScore } = pred.match;

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

      await this.updateGroupScores(pred.userId, points);
      affectedUsers.add(pred.userId);
    }

    for (const userId of affectedUsers) {
      await this.gamificacion.evaluateAchievements(userId);
    }

    this.logger.log(`Calculated points for ${finished.length} predictions in fixture ${fixtureId}`);
  }

  private async updateGroupScores(userId: string, points: number) {
    const [memberships, activeSeason] = await Promise.all([
      this.prisma.groupMember.findMany({
        where: { userId },
        include: {
          group: { include: { scores: { where: { userId } } } },
        },
      }),
      this.prisma.season.findFirst({ where: { isActive: true } }),
    ]);

    if (!activeSeason) return;

    for (const membership of memberships) {
      const existing = membership.group.scores[0];
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
            seasonId: activeSeason.id,
            total: points,
            streak: points > 0 ? 1 : 0,
          },
        });
      }
    }
  }
}
