import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GamificacionService {
  private readonly logger = new Logger(GamificacionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateAchievements(_userId: string) {
    // TODO: check FIRST_PREDICTION, PERFECT_ROUND, STREAK_5,
    // STREAK_10, EXACT_SCORE, GROUP_LEADER
    this.logger.log('Evaluating achievements...');
  }
}
