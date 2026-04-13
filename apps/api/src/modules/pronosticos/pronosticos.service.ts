import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Result } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreatePronosticoInput) {
    const fixture = await this.prisma.fixture.findUnique({
      where: { id: data.fixtureId },
    });
    if (!fixture) throw new NotFoundException('Fecha no encontrada');
    if (fixture.closeAt <= new Date()) {
      throw new BadRequestException('La fecha ya está cerrada para pronósticos');
    }

    return this.prisma.prediction.upsert({
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
  }

  async findByUserAndFixture(userId: string, fixtureId: string) {
    return this.prisma.prediction.findMany({
      where: { userId, fixtureId },
      include: { match: true },
    });
  }
}
