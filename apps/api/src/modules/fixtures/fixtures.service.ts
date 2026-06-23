import { Injectable, NotFoundException } from '@nestjs/common';
import { MATCH_LEAD_MS } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { CreateFixtureDto } from './dto/create-fixture.dto';
import { UpdateFixtureDto } from './dto/update-fixture.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

const MATCH_INCLUDE = {
  homeTeam: true,
  awayTeam: true,
  venue: true,
  group: true,
} as const;

/**
 * TTL corto: las fechas/partidos solo cambian al editarlos (admin) o cuando el
 * poller actualiza un resultado, casos en los que invalidamos explícitamente.
 */
const FIXTURES_TTL_SECONDS = 30;

@Injectable()
export class FixturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Invalida fixtures cacheados. La llama el scoring cuando cambia un match. */
  async invalidate(): Promise<void> {
    await this.cache.delByPattern('fixtures:*');
  }

  async findActive() {
    return this.cache.wrap('fixtures:active', FIXTURES_TTL_SECONDS, () => {
      // El pick de cada partido cierra 1h antes de su inicio. Una fecha sigue
      // "activa" mientras tenga al menos un partido cuyo cierre todavía no pasó
      // (startTime > ahora - 1h), sin importar el closeAt de la fecha.
      const openThreshold = new Date(Date.now() - MATCH_LEAD_MS);
      return this.prisma.fixture.findMany({
        where: { matches: { some: { startTime: { gt: openThreshold } } } },
        include: { matches: { include: MATCH_INCLUDE, orderBy: { startTime: 'asc' } } },
        orderBy: { closeAt: 'asc' },
      });
    });
  }

  async findUpcoming(limit = 5) {
    return this.cache.wrap(`fixtures:upcoming:${limit}`, FIXTURES_TTL_SECONDS, () =>
      this.prisma.fixture.findMany({
        include: { matches: { include: MATCH_INCLUDE, orderBy: { startTime: 'asc' } } },
        orderBy: { closeAt: 'asc' },
        take: limit,
      }),
    );
  }

  async findOne(id: string) {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id },
      include: { matches: { include: MATCH_INCLUDE, orderBy: { startTime: 'asc' } } },
    });
    if (!fixture) throw new NotFoundException('Fecha no encontrada');
    return fixture;
  }

  async create(data: CreateFixtureDto) {
    await this.invalidate();
    return this.prisma.fixture.create({
      data: {
        tournamentId: data.tournamentId,
        round: data.round,
        closeAt: data.closeAt,
        matches: data.matches?.length
          ? {
              create: data.matches.map((m) => ({
                homeTeamName: m.homeTeam,
                awayTeamName: m.awayTeam,
                startTime: m.startTime,
                externalId: m.externalId,
                tournamentId: data.tournamentId,
              })),
            }
          : undefined,
      },
      include: { matches: true },
    });
  }

  async update(id: string, data: UpdateFixtureDto) {
    await this.ensureExists(id);
    const updated = await this.prisma.fixture.update({ where: { id }, data });
    await this.invalidate();
    return updated;
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.prediction.deleteMany({ where: { fixtureId: id } }),
      this.prisma.match.deleteMany({ where: { fixtureId: id } }),
      this.prisma.fixture.delete({ where: { id } }),
    ]);
    await this.invalidate();
    return { id };
  }

  async updateMatch(matchId: string, data: UpdateMatchDto) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Partido no encontrado');
    const updated = await this.prisma.match.update({ where: { id: matchId }, data });
    await this.invalidate();
    return updated;
  }

  private async ensureExists(id: string) {
    const f = await this.prisma.fixture.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!f) throw new NotFoundException('Fecha no encontrada');
  }
}
