import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { POINTS_CORRECT_RESULT } from '@prode/shared';

@Injectable()
export class GamificacionService {
  private readonly logger = new Logger(GamificacionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async evaluateAchievements(userId: string) {
    const [predCount, groupScores] = await Promise.all([
      this.prisma.prediction.count({ where: { userId } }),
      this.prisma.groupScore.findMany({ where: { userId } }),
    ]);

    const checks: Promise<void>[] = [];

    if (predCount >= 1) {
      checks.push(this.unlockAchievement(userId, 'FIRST_PREDICTION'));
    }

    const maxStreak = groupScores.reduce((max, s) => Math.max(max, s.streak), 0);
    if (maxStreak >= 5) checks.push(this.unlockAchievement(userId, 'STREAK_5'));
    if (maxStreak >= 10) checks.push(this.unlockAchievement(userId, 'STREAK_10'));

    const exactScorePred = await this.prisma.prediction.findFirst({
      where: { userId, pointsEarned: { gt: POINTS_CORRECT_RESULT } },
    });
    if (exactScorePred) checks.push(this.unlockAchievement(userId, 'EXACT_SCORE'));

    // PERFECT_ROUND: all predictions in a fixture are correct (pointsEarned > 0)
    const fixtures = await this.prisma.fixture.findMany({
      where: { predictions: { some: { userId } } },
      include: {
        predictions: { where: { userId } },
        matches: true,
      },
    });

    for (const fixture of fixtures) {
      const allSettled = fixture.predictions.every((p) => p.pointsEarned !== null);
      if (
        allSettled &&
        fixture.predictions.length === fixture.matches.length &&
        fixture.predictions.every((p) => (p.pointsEarned ?? 0) > 0)
      ) {
        checks.push(this.unlockAchievement(userId, 'PERFECT_ROUND'));
        break;
      }
    }

    await Promise.all(checks);
  }

  private async unlockAchievement(userId: string, achievementKey: string) {
    const achievement = await this.prisma.achievement.findUnique({
      where: { key: achievementKey },
    });
    if (!achievement) return;

    try {
      await this.prisma.userAchievement.create({
        data: { userId, achievementId: achievement.id },
      });
      this.logger.log(`Achievement unlocked: ${achievementKey} for user ${userId}`);
    } catch {
      // Already unlocked (unique constraint) — ignore
    }
  }
}
