import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista todos los torneos (con conteos básicos). */
  async findAll() {
    return this.prisma.tournament.findMany({
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
      include: {
        _count: { select: { teams: true, matches: true, fixtures: true } },
      },
    });
  }

  /** Torneo activo principal (Mundial 2026 una vez importado). */
  async findActive() {
    return this.prisma.tournament.findFirst({
      where: { isActive: true },
      include: {
        _count: { select: { teams: true, matches: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        groups: { orderBy: { name: 'asc' } },
        _count: { select: { teams: true, matches: true } },
      },
    });
    if (!t) throw new NotFoundException('Torneo no encontrado');
    return t;
  }

  /** Grupos con sus equipos + standings actuales. */
  async getGroupsWithStandings(tournamentId: string) {
    const groups = await this.prisma.tournamentGroup.findMany({
      where: { tournamentId },
      orderBy: { name: 'asc' },
      include: {
        teams: {
          include: {
            team: true,
          },
        },
        standings: {
          include: { team: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    return groups;
  }

  /** Todos los partidos del torneo agrupados por fixture/matchday. */
  async getSchedule(tournamentId: string) {
    return this.prisma.fixture.findMany({
      where: { tournamentId },
      orderBy: { round: 'asc' },
      include: {
        matches: {
          orderBy: { startTime: 'asc' },
          include: {
            homeTeam: true,
            awayTeam: true,
            venue: true,
            group: true,
          },
        },
      },
    });
  }

  /** Estadios del torneo (los que aparecen en algún match). */
  async getVenues(tournamentId: string) {
    const venues = await this.prisma.venue.findMany({
      where: { matches: { some: { tournamentId } } },
      include: {
        _count: { select: { matches: { where: { tournamentId } } } },
      },
      orderBy: { capacity: 'desc' },
    });
    return venues;
  }

  /** Lista de equipos con datos completos. */
  async getTeams(tournamentId: string) {
    const tts = await this.prisma.tournamentTeam.findMany({
      where: { tournamentId },
      include: {
        team: true,
        group: true,
      },
    });
    return tts.map((tt) => ({
      ...tt.team,
      group: tt.group?.name ?? null,
      fifaRanking: tt.fifaRanking,
    }));
  }

  async getBracket(tournamentId: string) {
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        stage: { in: ['R32', 'R16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL'] },
      },
      orderBy: [{ stage: 'asc' }, { startTime: 'asc' }],
      include: {
        homeTeam: true,
        awayTeam: true,
        venue: true,
      },
    });
  }
}
