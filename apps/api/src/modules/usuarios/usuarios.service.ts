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

  /**
   * Métricas agregadas del usuario para la página de perfil.
   *
   * Antes traía TODAS las predicciones del usuario (con match + fixture
   * incluidos) y filtraba/agrupaba en JS: O(historial) en memoria por request.
   * Ahora todo se calcula en la DB con agregaciones e índices: cada métrica es
   * un COUNT/SUM sobre (userId, …) y la "mejor fecha" es un GROUP BY con LIMIT 1.
   */
  async getStats(userId: string) {
    // Predicado común de "predicción liquidada": partido FINISHED y con puntos.
    const settledWhere: Prisma.PredictionWhereInput = {
      userId,
      pointsEarned: { not: null },
      match: { is: { status: MatchStatus.FINISHED } },
    };

    // Lecturas independientes en paralelo. Usamos Promise.all (no $transaction)
    // porque son métricas read-only: no necesitan atomicidad y así Prisma
    // conserva el tipo preciso de cada agregación.
    const [
      totalPredictions,
      settledAgg,
      hits,
      exactScores,
      captainPlayed,
      captainHits,
      bestFixtureGroup,
    ] = await Promise.all([
      this.prisma.prediction.count({ where: { userId } }),
      this.prisma.prediction.aggregate({
        where: settledWhere,
        _count: { _all: true },
        _sum: { pointsEarned: true },
      }),
      this.prisma.prediction.count({
        where: { ...settledWhere, pointsEarned: { gt: 0 } },
      }),
      this.prisma.prediction.count({
        where: { ...settledWhere, pointsEarned: { gt: POINTS_CORRECT_RESULT } },
      }),
      this.prisma.prediction.count({
        where: { ...settledWhere, isCaptain: true },
      }),
      this.prisma.prediction.count({
        where: { ...settledWhere, isCaptain: true, pointsEarned: { gt: 0 } },
      }),
      // Mejor fecha: fixture con mayor suma de puntos. GROUP BY en la DB,
      // ordenado y limitado a 1 — no traemos las predicciones a memoria.
      this.prisma.prediction.groupBy({
        by: ['fixtureId'],
        where: settledWhere,
        _sum: { pointsEarned: true },
        _count: { fixtureId: true },
        orderBy: { _sum: { pointsEarned: 'desc' } },
        take: 1,
      }),
    ]);

    const settledCount = settledAgg._count._all;
    const totalPoints = settledAgg._sum.pointsEarned ?? 0;

    let bestFixture: {
      id: string;
      name: string;
      total: number;
      hits: number;
      matches: number;
    } | null = null;
    const top = bestFixtureGroup[0];
    if (top) {
      const fx = await this.prisma.fixture.findUnique({
        where: { id: top.fixtureId },
        select: { id: true, name: true, round: true },
      });
      const fixtureHits = await this.prisma.prediction.count({
        where: { ...settledWhere, fixtureId: top.fixtureId, pointsEarned: { gt: 0 } },
      });
      if (fx) {
        bestFixture = {
          id: fx.id,
          name: fx.name ?? `Fecha ${fx.round}`,
          total: top._sum.pointsEarned ?? 0,
          hits: fixtureHits,
          matches: top._count.fixtureId,
        };
      }
    }

    return {
      totalPredictions,
      settledPredictions: settledCount,
      hits,
      hitRate: settledCount ? Math.round((hits / settledCount) * 100) : 0,
      exactScores,
      captain: {
        played: captainPlayed,
        hits: captainHits,
        hitRate: captainPlayed
          ? Math.round((captainHits / captainPlayed) * 100)
          : 0,
      },
      totalPoints,
      bestFixture,
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
