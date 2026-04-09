import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalRanking() {
    // TODO: aggregate scores across all groups for active season
    return [];
  }

  async getGroupRanking(groupId: string) {
    return this.prisma.groupScore.findMany({
      where: { groupId },
      orderBy: { total: 'desc' },
    });
  }
}
