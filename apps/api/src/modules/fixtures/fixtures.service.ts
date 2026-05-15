import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFixtureDto } from './dto/create-fixture.dto';
import { UpdateFixtureDto } from './dto/update-fixture.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Injectable()
export class FixturesService {
  constructor(private readonly prisma: PrismaService) {}

  async findActive() {
    return this.prisma.fixture.findMany({
      where: { closeAt: { gt: new Date() } },
      include: { matches: { orderBy: { startTime: 'asc' } } },
      orderBy: { closeAt: 'asc' },
    });
  }

  async findUpcoming(limit = 5) {
    return this.prisma.fixture.findMany({
      include: { matches: { orderBy: { startTime: 'asc' } } },
      orderBy: { closeAt: 'asc' },
      take: limit,
    });
  }

  async findOne(id: string) {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id },
      include: { matches: { orderBy: { startTime: 'asc' } } },
    });
    if (!fixture) throw new NotFoundException('Fecha no encontrada');
    return fixture;
  }

  async create(data: CreateFixtureDto) {
    return this.prisma.fixture.create({
      data: {
        seasonId: data.seasonId,
        round: data.round,
        closeAt: data.closeAt,
        matches: data.matches?.length
          ? { create: data.matches }
          : undefined,
      },
      include: { matches: true },
    });
  }

  async update(id: string, data: UpdateFixtureDto) {
    await this.ensureExists(id);
    return this.prisma.fixture.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.$transaction([
      this.prisma.prediction.deleteMany({ where: { fixtureId: id } }),
      this.prisma.match.deleteMany({ where: { fixtureId: id } }),
      this.prisma.fixture.delete({ where: { id } }),
    ]);
    return { id };
  }

  async updateMatch(matchId: string, data: UpdateMatchDto) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) throw new NotFoundException('Partido no encontrado');
    return this.prisma.match.update({ where: { id: matchId }, data });
  }

  private async ensureExists(id: string) {
    const f = await this.prisma.fixture.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!f) throw new NotFoundException('Fecha no encontrada');
  }
}
