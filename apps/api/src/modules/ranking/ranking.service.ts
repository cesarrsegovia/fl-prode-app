import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalRanking() {
    const scores = await this.prisma.groupScore.groupBy({
      by: ['userId'],
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
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
    }));
  }

  async getGroupRanking(groupId: string) {
    const scores = await this.prisma.groupScore.findMany({
      where: { groupId },
      orderBy: { total: 'desc' },
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
      total: s.total,
      streak: s.streak,
    }));
  }
}
