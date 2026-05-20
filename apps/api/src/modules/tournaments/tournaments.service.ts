import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../provider/provider.service';
import { ProviderClientError } from '../provider/provider.client';

@Injectable()
export class TournamentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerService: ProviderService,
  ) {}

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

  // ---------- BracketPick (predicción de campeón) ----------

  async getMyBracketPick(tournamentId: string, userId: string) {
    return this.prisma.bracketPick.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
      include: { champTeam: true },
    });
  }

  async setBracketPick(
    tournamentId: string,
    userId: string,
    champTeamId: string,
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { startDate: true },
    });
    if (!tournament) throw new NotFoundException('Torneo no encontrado');

    // Permitir cambios solo antes del inicio del torneo.
    if (tournament.startDate && tournament.startDate <= new Date()) {
      throw new NotFoundException(
        'El torneo ya comenzó, no se puede modificar el campeón.',
      );
    }

    // Verificar que el team pertenezca al torneo.
    const tt = await this.prisma.tournamentTeam.findUnique({
      where: {
        tournamentId_teamId: { tournamentId, teamId: champTeamId },
      },
    });
    if (!tt) {
      throw new NotFoundException('El equipo no participa en este torneo');
    }

    return this.prisma.bracketPick.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      update: { champTeamId },
      create: { userId, tournamentId, champTeamId },
      include: { champTeam: true },
    });
  }

  // ---------- TournamentEntry (inscripción + moveFunds Debit) ----------

  async getMyEntry(tournamentId: string, userId: string) {
    return this.prisma.tournamentEntry.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
    });
  }

  /**
   * Inscribe al usuario en el torneo. Si el torneo tiene entryFee, cobra contra
   * el wallet del padre mediante moveFunds Debit y crea TournamentEntry como PAID.
   * Si no hay entryFee, crea entry directa.
   */
  async joinTournament(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        name: true,
        externalId: true,
        entryFee: true,
        entryCurrency: true,
        startDate: true,
      },
    });
    if (!tournament) throw new NotFoundException('Torneo no encontrado');

    if (tournament.startDate && tournament.startDate <= new Date()) {
      throw new BadRequestException(
        'El torneo ya comenzó, las inscripciones están cerradas',
      );
    }

    const existing = await this.prisma.tournamentEntry.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
    });
    if (existing && existing.status === 'PAID') {
      throw new ConflictException('Ya estás inscripto en este torneo');
    }

    // Gratis: solo registramos la entry.
    if (!tournament.entryFee || Number(tournament.entryFee) === 0) {
      return this.prisma.tournamentEntry.upsert({
        where: { userId_tournamentId: { userId, tournamentId } },
        create: {
          userId,
          tournamentId,
          amount: 0,
          currency: tournament.entryCurrency || 'USD',
          status: 'PAID',
        },
        update: { status: 'PAID' },
      });
    }

    // Con costo: disparamos moveFunds Debit al padre. Esto crea la WalletTransaction
    // y, vía ProviderService.syncTournamentEntry, también el TournamentEntry.
    try {
      await this.providerService.moveFunds({
        userId,
        direction: 'Debit',
        amount: tournament.entryFee,
        currency: tournament.entryCurrency || 'USD',
        eventId: `tournament-entry:${tournamentId}`,
        gameId: tournament.externalId || tournamentId,
        gameType: 'ProdeTournament',
        tournamentId,
      });
    } catch (err) {
      if (err instanceof ProviderClientError) {
        const code = err.providerErrors?.[0]?.code;
        if (code === 'ERR-FUND-003') {
          throw new BadRequestException(
            'Saldo insuficiente para inscribirse al torneo',
          );
        }
        throw new BadRequestException(
          err.providerErrors?.[0]?.detail || 'No se pudo procesar la inscripción',
        );
      }
      throw err;
    }

    return this.prisma.tournamentEntry.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
    });
  }

  async getBracketPickAggregate(tournamentId: string) {
    const grouped = await this.prisma.bracketPick.groupBy({
      by: ['champTeamId'],
      where: { tournamentId },
      _count: { _all: true },
    });
    if (!grouped.length) return { total: 0, picks: [] };

    const teamIds = grouped.map((g) => g.champTeamId);
    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true, shortName: true, flagUrl: true },
    });
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    const total = grouped.reduce((acc, g) => acc + g._count._all, 0);

    return {
      total,
      picks: grouped
        .map((g) => ({
          team: teamMap.get(g.champTeamId),
          count: g._count._all,
          pct: Math.round((g._count._all / total) * 100),
        }))
        .sort((a, b) => b.count - a.count),
    };
  }
}
