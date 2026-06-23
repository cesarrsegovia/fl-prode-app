import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { GROUP_SCORE_ORDER_BY } from './ranking-order';

/** TTL del ranking cacheado. El ranking no necesita ser exacto al segundo. */
const RANKING_TTL_SECONDS = 20;

@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Invalida todo el ranking cacheado. La llama el scoring tras recalcular. */
  async invalidate(): Promise<void> {
    await this.cache.delByPattern('ranking:*');
  }

  async getGlobalRanking(tournamentId?: string) {
    const key = `ranking:global:${tournamentId ?? 'all'}`;
    return this.cache.wrap(key, RANKING_TTL_SECONDS, () =>
      this.computeGlobalRanking(tournamentId),
    );
  }

  private async computeGlobalRanking(tournamentId?: string) {
    // El ranking global lee UserScore (puntaje por usuario+torneo, independiente
    // de grupos), de modo que también figuren los jugadores que entran desde el
    // provider sin unirse a ningún grupo.
    // Sin tournamentId consolidamos el puntaje del usuario sumando torneos
    // (una sola fila por usuario), como hacía el ranking anterior.
    const where = tournamentId ? { tournamentId } : {};
    const scores = await this.prisma.userScore.groupBy({
      by: ['userId'],
      where,
      _sum: {
        total: true,
        correctWinners: true,
        exactScores: true,
        exactGoalsSum: true,
      },
      _min: { firstPredictionAt: true },
      orderBy: [
        { _sum: { total: 'desc' } },
        { _sum: { correctWinners: 'desc' } },
        { _sum: { exactScores: 'desc' } },
        { _sum: { exactGoalsSum: 'desc' } },
        { _min: { firstPredictionAt: 'asc' } },
      ],
      take: 100,
    });

    if (!scores.length) return [];

    const userIds = scores.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return scores.map((s, idx) => ({
      position: idx + 1,
      userId: s.userId,
      username: userMap.get(s.userId)?.username,
      avatarUrl: userMap.get(s.userId)?.avatarUrl,
      total: s._sum.total ?? 0,
      streak: 0,
      correctWinners: s._sum.correctWinners ?? 0,
      exactScores: s._sum.exactScores ?? 0,
      exactGoalsSum: s._sum.exactGoalsSum ?? 0,
      positionChange: 0,
    }));
  }

  async getGroupRanking(
    groupId: string,
    tournamentId?: string,
    take = 100,
    skip = 0,
  ) {
    const key = `ranking:group:${groupId}:${tournamentId ?? 'all'}:${take}:${skip}`;
    return this.cache.wrap(key, RANKING_TTL_SECONDS, () =>
      this.computeGroupRanking(groupId, tournamentId, take, skip),
    );
  }

  private async computeGroupRanking(
    groupId: string,
    tournamentId?: string,
    take = 100,
    skip = 0,
  ) {
    const where: { groupId: string; tournamentId?: string } = { groupId };
    if (tournamentId) where.tournamentId = tournamentId;
    const scores = await this.prisma.groupScore.findMany({
      where,
      orderBy: GROUP_SCORE_ORDER_BY,
      take,
      skip,
    });

    if (!scores.length) return [];

    const userIds = scores.map((s) => s.userId);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, avatarUrl: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return scores.map((s, idx) => ({
      position: skip + idx + 1,
      userId: s.userId,
      username: userMap.get(s.userId)?.username,
      avatarUrl: userMap.get(s.userId)?.avatarUrl,
      total: s.total,
      streak: s.streak,
      correctWinners: s.correctWinners,
      exactScores: s.exactScores,
      exactGoalsSum: s.exactGoalsSum,
      positionChange: 0,
    }));
  }
}
