import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const team = await this.prisma.team.findUnique({
      where: { id },
      include: {
        tournamentTeams: {
          include: {
            tournament: { select: { id: true, name: true, isActive: true } },
            group: true,
          },
        },
      },
    });
    if (!team) throw new NotFoundException('Selección no encontrada');
    return team;
  }

  /** Partidos del equipo en un torneo (como local o visitante). */
  async getMatches(teamId: string, tournamentId: string) {
    return this.prisma.match.findMany({
      where: {
        tournamentId,
        OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
      },
      orderBy: { startTime: 'asc' },
      include: {
        homeTeam: true,
        awayTeam: true,
        venue: true,
        group: true,
      },
    });
  }

  /**
   * Plantilla del equipo en un torneo (si fue importada). Incluye cuerpo
   * técnico (isStaff), que va primero; luego los jugadores por número.
   */
  async getSquad(teamId: string, tournamentId: string) {
    const entries = await this.prisma.squadEntry.findMany({
      where: { teamId, tournamentId },
      include: { player: true },
    });
    return entries
      .map((e) => e.player)
      .sort((a, b) => {
        // Staff primero (entrenador, asistentes), luego jugadores por número.
        if (a.isStaff !== b.isStaff) return a.isStaff ? -1 : 1;
        const an = a.number ?? 999;
        const bn = b.number ?? 999;
        return an - bn;
      });
  }
}
