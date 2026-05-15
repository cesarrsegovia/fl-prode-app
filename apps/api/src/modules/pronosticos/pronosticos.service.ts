import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, Result } from '@prisma/client';
import { WS_EVENTS } from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';

interface CreatePronosticoInput {
  userId: string;
  matchId: string;
  fixtureId: string;
  result: Result;
  homeScoreGuess?: number;
  awayScoreGuess?: number;
  isCaptain?: boolean;
}

@Injectable()
export class PronosticosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
  ) {}

  async create(data: CreatePronosticoInput) {
    const [fixture, match] = await Promise.all([
      this.prisma.fixture.findUnique({ where: { id: data.fixtureId } }),
      this.prisma.match.findUnique({ where: { id: data.matchId } }),
    ]);

    if (!fixture) throw new NotFoundException('Fecha no encontrada');
    if (!match) throw new NotFoundException('Partido no encontrado');
    if (match.fixtureId !== fixture.id) {
      throw new BadRequestException('El partido no pertenece a la fecha indicada');
    }
    if (fixture.closeAt <= new Date()) {
      throw new BadRequestException('La fecha ya está cerrada para pronósticos');
    }
    if (match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('El partido ya no acepta pronósticos');
    }

    if (data.isCaptain) {
      await this.prisma.prediction.updateMany({
        where: {
          userId: data.userId,
          fixtureId: data.fixtureId,
          isCaptain: true,
          matchId: { not: data.matchId },
        },
        data: { isCaptain: false },
      });
    }

    const prediction = await this.prisma.prediction.upsert({
      where: { userId_matchId: { userId: data.userId, matchId: data.matchId } },
      update: {
        result: data.result,
        homeScoreGuess: data.homeScoreGuess ?? null,
        awayScoreGuess: data.awayScoreGuess ?? null,
        isCaptain: data.isCaptain ?? false,
      },
      create: {
        userId: data.userId,
        matchId: data.matchId,
        fixtureId: data.fixtureId,
        result: data.result,
        homeScoreGuess: data.homeScoreGuess ?? null,
        awayScoreGuess: data.awayScoreGuess ?? null,
        isCaptain: data.isCaptain ?? false,
      },
    });
    this.events.emitToUser(data.userId, WS_EVENTS.PREDICTION_UPDATED, prediction);
    return prediction;
  }

  async findByUserAndFixture(userId: string, fixtureId: string) {
    return this.prisma.prediction.findMany({
      where: { userId, fixtureId },
      include: { match: true },
    });
  }

  async findMyFixtures(userId: string) {
    const predictions = await this.prisma.prediction.findMany({
      where: { userId },
      select: { fixtureId: true },
      distinct: ['fixtureId'],
    });
    const ids = predictions.map((p) => p.fixtureId);
    if (!ids.length) return [];
    return this.prisma.fixture.findMany({
      where: { id: { in: ids } },
      include: { _count: { select: { matches: true, predictions: true } } },
      orderBy: { closeAt: 'desc' },
    });
  }

  async remove(userId: string, predictionId: string) {
    const pred = await this.prisma.prediction.findUnique({
      where: { id: predictionId },
      include: { fixture: true },
    });
    if (!pred) throw new NotFoundException('Pronóstico no encontrado');
    if (pred.userId !== userId) throw new ForbiddenException('No es tu pronóstico');
    if (pred.fixture.closeAt <= new Date()) {
      throw new BadRequestException('La fecha ya está cerrada, no se puede borrar');
    }
    await this.prisma.prediction.delete({ where: { id: predictionId } });
    return { id: predictionId };
  }
}
