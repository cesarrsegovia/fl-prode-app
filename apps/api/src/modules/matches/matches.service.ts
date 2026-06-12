import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Result } from '@prisma/client';
import { matchLeadDeadline } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MatchesService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const match = await this.prisma.match.findUnique({
      where: { id },
      include: {
        homeTeam: true,
        awayTeam: true,
        venue: true,
        group: true,
        fixture: { select: { id: true, round: true, name: true, closeAt: true } },
        tournament: { select: { id: true, name: true } },
      },
    });
    if (!match) throw new NotFoundException('Partido no encontrado');
    return match;
  }

  /** Distribución de pronósticos: % para HOME/DRAW/AWAY. */
  async getPredictionsAggregate(matchId: string) {
    const grouped = await this.prisma.prediction.groupBy({
      by: ['result'],
      where: { matchId },
      _count: { _all: true },
    });
    const counts: Record<Result, number> = {
      [Result.HOME]: 0,
      [Result.DRAW]: 0,
      [Result.AWAY]: 0,
    };
    let total = 0;
    for (const row of grouped) {
      counts[row.result] = row._count._all;
      total += row._count._all;
    }
    return {
      total,
      home: counts.HOME,
      draw: counts.DRAW,
      away: counts.AWAY,
      homePct: total ? Math.round((counts.HOME / total) * 100) : 0,
      drawPct: total ? Math.round((counts.DRAW / total) * 100) : 0,
      awayPct: total ? Math.round((counts.AWAY / total) * 100) : 0,
    };
  }

  async getMyPrediction(userId: string, matchId: string) {
    return this.prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId } },
    });
  }

  /**
   * Lista por miembro: pick de cada uno del grupo para este partido.
   * Sólo visible si la fecha ya cerró (anti-leak de picks ajenos).
   * Requiere que `requesterId` sea miembro del grupo.
   */
  async getGroupPicks(matchId: string, groupId: string, requesterId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: requesterId, groupId } },
      select: { id: true },
    });
    if (!membership) {
      throw new ForbiddenException('No sos miembro de este grupo');
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { fixture: { select: { closeAt: true } } },
    });
    if (!match) throw new NotFoundException('Partido no encontrado');

    const closed = matchLeadDeadline(match.startTime) <= new Date();

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
    const memberUserIds = members.map((m) => m.userId);

    if (!closed) {
      // Pre-close: solo devolvemos al solicitante (anti-leak)
      const myPrediction = await this.prisma.prediction.findUnique({
        where: { userId_matchId: { userId: requesterId, matchId } },
        select: {
          result: true,
          homeScoreGuess: true,
          awayScoreGuess: true,
          isCaptain: true,
          pointsEarned: true,
        },
      });
      return {
        closed: false,
        members: members
          .filter((m) => m.userId === requesterId)
          .map((m) => ({
            user: m.user,
            prediction: myPrediction ?? null,
          })),
      };
    }

    const predictions = await this.prisma.prediction.findMany({
      where: { matchId, userId: { in: memberUserIds } },
      select: {
        userId: true,
        result: true,
        homeScoreGuess: true,
        awayScoreGuess: true,
        isCaptain: true,
        pointsEarned: true,
      },
    });
    const predByUser = new Map(predictions.map((p) => [p.userId, p]));

    return {
      closed: true,
      members: members.map((m) => ({
        user: m.user,
        prediction: predByUser.get(m.userId) ?? null,
      })),
    };
  }

  /** Aggregate limitado a miembros de un grupo social. */
  async getGroupAggregate(matchId: string, groupId: string) {
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const userIds = members.map((m) => m.userId);
    if (!userIds.length) {
      return {
        total: 0,
        members: 0,
        pending: 0,
        home: 0,
        draw: 0,
        away: 0,
        homePct: 0,
        drawPct: 0,
        awayPct: 0,
      };
    }

    const grouped = await this.prisma.prediction.groupBy({
      by: ['result'],
      where: { matchId, userId: { in: userIds } },
      _count: { _all: true },
    });
    const counts: Record<Result, number> = {
      [Result.HOME]: 0,
      [Result.DRAW]: 0,
      [Result.AWAY]: 0,
    };
    let total = 0;
    for (const row of grouped) {
      counts[row.result] = row._count._all;
      total += row._count._all;
    }
    return {
      total,
      members: userIds.length,
      pending: userIds.length - total,
      home: counts.HOME,
      draw: counts.DRAW,
      away: counts.AWAY,
      homePct: total ? Math.round((counts.HOME / total) * 100) : 0,
      drawPct: total ? Math.round((counts.DRAW / total) * 100) : 0,
      awayPct: total ? Math.round((counts.AWAY / total) * 100) : 0,
    };
  }
}
