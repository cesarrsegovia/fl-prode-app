import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, MatchStatus, Result } from '@prisma/client';
import {
  MatchStage as SharedMatchStage,
  WS_EVENTS,
  isMatchPredictionClosed,
} from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../websocket/events.gateway';
import { ActivityService } from '../activity/activity.service';

interface CreatePronosticoInput {
  userId: string;
  matchId: string;
  fixtureId: string;
  result: Result;
  homeScoreGuess?: number;
  awayScoreGuess?: number;
  isCaptain?: boolean;
  penaltyWinner?: Result;
}

@Injectable()
export class PronosticosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    private readonly activity: ActivityService,
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
    if (
      isMatchPredictionClosed({
        stage: match.stage as unknown as SharedMatchStage,
        startTime: match.startTime,
        fixtureCloseAt: fixture.closeAt,
      })
    ) {
      throw new BadRequestException(
        'El plazo para este pronóstico ya está cerrado',
      );
    }
    if (match.status !== MatchStatus.PENDING) {
      throw new BadRequestException('El partido ya no acepta pronósticos');
    }

    if (data.isCaptain) {
      // El capitán se elige una vez por fecha: si ya hay uno confirmado en otro
      // partido, no se puede cambiar.
      const existingCaptain = await this.prisma.prediction.findFirst({
        where: {
          userId: data.userId,
          fixtureId: data.fixtureId,
          isCaptain: true,
          matchId: { not: data.matchId },
        },
        select: { id: true },
      });
      if (existingCaptain) {
        throw new BadRequestException(
          'El capitán de esta fecha ya fue confirmado y no se puede cambiar',
        );
      }
    }

    const existingPredictionCount = await this.prisma.prediction.count({
      where: { userId: data.userId, fixtureId: data.fixtureId },
    });

    // El pick de penales solo tiene sentido si el usuario predijo empate; en
    // cualquier otro caso lo normalizamos a null para no dejar datos colgados.
    const penaltyWinner =
      data.result === Result.DRAW ? data.penaltyWinner ?? null : null;

    const prediction = await this.prisma.prediction.upsert({
      where: { userId_matchId: { userId: data.userId, matchId: data.matchId } },
      update: {
        result: data.result,
        homeScoreGuess: data.homeScoreGuess ?? null,
        awayScoreGuess: data.awayScoreGuess ?? null,
        isCaptain: data.isCaptain ?? false,
        penaltyWinner,
      },
      create: {
        userId: data.userId,
        matchId: data.matchId,
        fixtureId: data.fixtureId,
        result: data.result,
        homeScoreGuess: data.homeScoreGuess ?? null,
        awayScoreGuess: data.awayScoreGuess ?? null,
        isCaptain: data.isCaptain ?? false,
        penaltyWinner,
      },
    });
    this.events.emitToUser(data.userId, WS_EVENTS.PREDICTION_UPDATED, prediction);

    if (existingPredictionCount === 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { username: true },
      });
      const fixtureName = fixture.name ?? `Fecha ${fixture.round}`;
      await this.activity.emitToUserGroups(data.userId, () => ({
        userId: data.userId,
        type: ActivityType.PREDICTIONS_SUBMITTED,
        message: `${user?.username ?? 'Alguien'} cargó pronósticos para ${fixtureName}`,
        payload: { fixtureId: fixture.id, round: fixture.round },
      }));
    }

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

  /** IDs de matches que el usuario ya pronostico (para barra de progreso). */
  async findMyPredictedMatchIds(userId: string): Promise<string[]> {
    const rows = await this.prisma.prediction.findMany({
      where: { userId },
      select: { matchId: true },
    });
    return rows.map((r) => r.matchId);
  }

  async remove(userId: string, predictionId: string) {
    const pred = await this.prisma.prediction.findUnique({
      where: { id: predictionId },
      include: { fixture: true, match: true },
    });
    if (!pred) throw new NotFoundException('Pronóstico no encontrado');
    if (pred.userId !== userId) throw new ForbiddenException('No es tu pronóstico');
    if (
      isMatchPredictionClosed({
        stage: pred.match.stage as unknown as SharedMatchStage,
        startTime: pred.match.startTime,
        fixtureCloseAt: pred.fixture.closeAt,
      })
    ) {
      throw new BadRequestException(
        'El plazo ya está cerrado, no se puede borrar',
      );
    }
    await this.prisma.prediction.delete({ where: { id: predictionId } });
    return { id: predictionId };
  }
}
