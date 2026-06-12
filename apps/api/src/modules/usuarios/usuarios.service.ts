import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus, Prisma } from '@prisma/client';
import { POINTS_CORRECT_RESULT } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: {
          id: true,
          email: true,
          username: true,
          avatarUrl: true,
          bio: true,
        },
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
      throw err;
    }
  }

  /** Métricas agregadas del usuario para la página de perfil. */
  async getStats(userId: string) {
    const predictions = await this.prisma.prediction.findMany({
      where: { userId },
      include: { match: true, fixture: { select: { id: true, name: true, round: true } } },
    });

    const settled = predictions.filter(
      (p) => p.match.status === MatchStatus.FINISHED && p.pointsEarned !== null,
    );

    const exactScores = settled.filter(
      (p) => (p.pointsEarned ?? 0) > POINTS_CORRECT_RESULT,
    ).length;

    const hits = settled.filter((p) => (p.pointsEarned ?? 0) > 0).length;

    const captainSettled = settled.filter((p) => p.isCaptain);
    const captainHits = captainSettled.filter(
      (p) => (p.pointsEarned ?? 0) > 0,
    ).length;

    const totalPoints = settled.reduce(
      (acc, p) => acc + (p.pointsEarned ?? 0),
      0,
    );

    // Mejor fecha: mayor suma de pointsEarned por fixture
    const byFixture = new Map<string, { fixture: typeof predictions[number]['fixture']; total: number; hits: number; matches: number }>();
    for (const p of settled) {
      const cur = byFixture.get(p.fixtureId) ?? {
        fixture: p.fixture,
        total: 0,
        hits: 0,
        matches: 0,
      };
      cur.total += p.pointsEarned ?? 0;
      if ((p.pointsEarned ?? 0) > 0) cur.hits++;
      cur.matches++;
      byFixture.set(p.fixtureId, cur);
    }
    const bestFixture = [...byFixture.values()].sort(
      (a, b) => b.total - a.total,
    )[0];

    return {
      totalPredictions: predictions.length,
      settledPredictions: settled.length,
      hits,
      hitRate: settled.length ? Math.round((hits / settled.length) * 100) : 0,
      exactScores,
      captain: {
        played: captainSettled.length,
        hits: captainHits,
        hitRate: captainSettled.length
          ? Math.round((captainHits / captainSettled.length) * 100)
          : 0,
      },
      totalPoints,
      bestFixture: bestFixture
        ? {
            id: bestFixture.fixture.id,
            name: bestFixture.fixture.name ?? `Fecha ${bestFixture.fixture.round}`,
            total: bestFixture.total,
            hits: bestFixture.hits,
            matches: bestFixture.matches,
          }
        : null,
    };
  }

  async getAchievements(userId: string) {
    const all = await this.prisma.achievement.findMany({
      orderBy: { key: 'asc' },
    });
    const unlocked = await this.prisma.userAchievement.findMany({
      where: { userId },
    });
    const unlockedMap = new Map(
      unlocked.map((u) => [u.achievementId, u.unlockedAt]),
    );

    return all.map((a) => ({
      id: a.id,
      key: a.key,
      name: a.name,
      description: a.description,
      unlocked: unlockedMap.has(a.id),
      unlockedAt: unlockedMap.get(a.id) ?? null,
    }));
  }

  /**
   * Historial de picks de partido de otro usuario, ocultando los partidos que
   * aún no cerraron (cierre por partido = startTime − 1h). Misma forma que
   * getPredictionsHistory para reusar el render en el front.
   */
  async getVisiblePredictionsHistory(
    userId: string,
    opts: { take?: number; cursor?: string } = {},
  ) {
    const take = Math.min(opts.take ?? 30, 100);
    const now = new Date();
    const cursor = opts.cursor ? { id: opts.cursor } : undefined;
    const items = await this.prisma.prediction.findMany({
      where: {
        userId,
        match: { startTime: { lte: new Date(now.getTime() + 60 * 60 * 1000) } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor, skip: 1 }),
      include: {
        match: { include: { homeTeam: true, awayTeam: true } },
        fixture: { select: { id: true, round: true, name: true } },
      },
    });
    const hasMore = items.length > take;
    const rows = hasMore ? items.slice(0, take) : items;
    return {
      items: rows,
      nextCursor: hasMore ? rows[rows.length - 1].id : null,
    };
  }

  async getPredictionsHistory(
    userId: string,
    opts: { take?: number; cursor?: string } = {},
  ) {
    const take = Math.min(opts.take ?? 30, 100);
    const cursor = opts.cursor ? { id: opts.cursor } : undefined;
    const items = await this.prisma.prediction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && { cursor, skip: 1 }),
      include: {
        match: {
          include: {
            homeTeam: true,
            awayTeam: true,
          },
        },
        fixture: {
          select: { id: true, round: true, name: true },
        },
      },
    });
    const hasMore = items.length > take;
    const rows = hasMore ? items.slice(0, take) : items;
    return {
      items: rows,
      nextCursor: hasMore ? rows[rows.length - 1].id : null,
    };
  }
}
