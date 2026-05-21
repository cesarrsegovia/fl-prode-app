import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStage, MatchStatus, R32PickKind } from '@prisma/client';
import {
  POINTS_R32_QUALIFIER,
  R32_BEST_THIRDS_TOTAL,
  R32_GROUPS_COUNT,
  R32_TOP2_PER_GROUP,
  R32_TOP2_TOTAL,
  R32_TOTAL_QUALIFIERS,
  championPickDeadline,
  r32QualifierDeadline,
} from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../provider/provider.service';
import { ProviderClientError } from '../provider/provider.client';

interface R32PickInputItem {
  teamId: string;
  kind: R32PickKind;
}

const ROUND_3_GROUP_MATCHDAY = 3;

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

    if (
      tournament.startDate &&
      championPickDeadline(tournament.startDate).getTime() <= Date.now()
    ) {
      throw new BadRequestException(
        'El plazo para elegir campeón ya está cerrado.',
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

  // ---------- R32QualifierPick (32 equipos que pasan a 16vos) ----------

  /**
   * Deadline para los picks de R32: día previo al primer partido de la 3ra fecha
   * de grupos (round=3). Si todavía no hay fixture cargado para round 3, retorna null.
   */
  async getR32Deadline(tournamentId: string): Promise<Date | null> {
    const round3 = await this.prisma.fixture.findUnique({
      where: {
        tournamentId_round: {
          tournamentId,
          round: ROUND_3_GROUP_MATCHDAY,
        },
      },
      include: {
        matches: {
          orderBy: { startTime: 'asc' },
          take: 1,
          select: { startTime: true },
        },
      },
    });
    const firstStart = round3?.matches[0]?.startTime;
    if (!firstStart) return null;
    return r32QualifierDeadline(firstStart);
  }

  async getMyR32Picks(tournamentId: string, userId: string) {
    return this.prisma.r32QualifierPick.findMany({
      where: { userId, tournamentId },
      include: { team: true },
      orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async setR32Picks(
    tournamentId: string,
    userId: string,
    picks: R32PickInputItem[],
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });
    if (!tournament) throw new NotFoundException('Torneo no encontrado');

    const deadline = await this.getR32Deadline(tournamentId);
    if (deadline && deadline.getTime() <= Date.now()) {
      throw new BadRequestException(
        'El plazo para elegir los clasificados a 16vos ya está cerrado.',
      );
    }

    if (picks.length !== R32_TOTAL_QUALIFIERS) {
      throw new BadRequestException(
        `Tenés que enviar exactamente ${R32_TOTAL_QUALIFIERS} picks.`,
      );
    }

    const teamIds = picks.map((p) => p.teamId);
    if (new Set(teamIds).size !== teamIds.length) {
      throw new BadRequestException('No podés repetir equipos.');
    }

    const top2 = picks.filter((p) => p.kind === R32PickKind.TOP2);
    const thirds = picks.filter((p) => p.kind === R32PickKind.BEST_THIRD);
    if (top2.length !== R32_TOP2_TOTAL) {
      throw new BadRequestException(
        `Tenés que elegir ${R32_TOP2_TOTAL} equipos como Top-2 de grupo.`,
      );
    }
    if (thirds.length !== R32_BEST_THIRDS_TOTAL) {
      throw new BadRequestException(
        `Tenés que elegir ${R32_BEST_THIRDS_TOTAL} mejores terceros.`,
      );
    }

    // Verificar pertenencia al torneo + agrupar por grupo
    const teamRows = await this.prisma.tournamentTeam.findMany({
      where: { tournamentId, teamId: { in: teamIds } },
      select: { teamId: true, groupId: true },
    });
    if (teamRows.length !== teamIds.length) {
      throw new BadRequestException(
        'Hay equipos que no participan en este torneo.',
      );
    }
    const groupByTeam = new Map(teamRows.map((r) => [r.teamId, r.groupId]));

    // Cada grupo debe aportar exactamente R32_TOP2_PER_GROUP picks TOP2
    const top2ByGroup = new Map<string, number>();
    for (const p of top2) {
      const groupId = groupByTeam.get(p.teamId);
      if (!groupId) {
        throw new BadRequestException(
          'Equipo Top-2 sin grupo asignado en el torneo.',
        );
      }
      top2ByGroup.set(groupId, (top2ByGroup.get(groupId) ?? 0) + 1);
    }
    if (top2ByGroup.size !== R32_GROUPS_COUNT) {
      throw new BadRequestException(
        `Tenés que elegir Top-2 de los ${R32_GROUPS_COUNT} grupos.`,
      );
    }
    for (const [, count] of top2ByGroup) {
      if (count !== R32_TOP2_PER_GROUP) {
        throw new BadRequestException(
          `Tenés que elegir exactamente ${R32_TOP2_PER_GROUP} equipos Top-2 por grupo.`,
        );
      }
    }

    // Reemplazo total en una transacción
    await this.prisma.$transaction([
      this.prisma.r32QualifierPick.deleteMany({
        where: { userId, tournamentId },
      }),
      this.prisma.r32QualifierPick.createMany({
        data: picks.map((p) => ({
          userId,
          tournamentId,
          teamId: p.teamId,
          kind: p.kind,
        })),
      }),
    ]);

    return this.getMyR32Picks(tournamentId, userId);
  }

  /**
   * Calcula los 32 equipos que clasificaron a 16vos a partir de los partidos
   * de fase de grupos FINISHED. Devuelve null si no están todos los partidos
   * de grupos terminados.
   */
  async computeR32Qualifiers(tournamentId: string): Promise<Set<string> | null> {
    const groupMatches = await this.prisma.match.findMany({
      where: { tournamentId, stage: MatchStage.GROUP },
      select: {
        groupId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        status: true,
      },
    });
    if (!groupMatches.length) return null;
    const allFinished = groupMatches.every(
      (m) =>
        m.status === MatchStatus.FINISHED &&
        m.homeScore !== null &&
        m.awayScore !== null &&
        m.homeTeamId &&
        m.awayTeamId &&
        m.groupId,
    );
    if (!allFinished) return null;

    interface Stats {
      teamId: string;
      groupId: string;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
    }
    const stats = new Map<string, Stats>();
    const ensure = (teamId: string, groupId: string) => {
      let s = stats.get(teamId);
      if (!s) {
        s = {
          teamId,
          groupId,
          points: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDiff: 0,
        };
        stats.set(teamId, s);
      }
      return s;
    };

    for (const m of groupMatches) {
      const home = ensure(m.homeTeamId!, m.groupId!);
      const away = ensure(m.awayTeamId!, m.groupId!);
      const hs = m.homeScore!;
      const as = m.awayScore!;
      home.goalsFor += hs;
      home.goalsAgainst += as;
      away.goalsFor += as;
      away.goalsAgainst += hs;
      if (hs > as) home.points += 3;
      else if (hs < as) away.points += 3;
      else {
        home.points += 1;
        away.points += 1;
      }
    }
    for (const s of stats.values()) {
      s.goalDiff = s.goalsFor - s.goalsAgainst;
    }

    const cmp = (a: Stats, b: Stats) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor;

    const byGroup = new Map<string, Stats[]>();
    for (const s of stats.values()) {
      if (!byGroup.has(s.groupId)) byGroup.set(s.groupId, []);
      byGroup.get(s.groupId)!.push(s);
    }
    for (const arr of byGroup.values()) arr.sort(cmp);

    const qualifiers = new Set<string>();
    const thirdPlaced: Stats[] = [];
    for (const arr of byGroup.values()) {
      if (arr[0]) qualifiers.add(arr[0].teamId);
      if (arr[1]) qualifiers.add(arr[1].teamId);
      if (arr[2]) thirdPlaced.push(arr[2]);
    }
    thirdPlaced.sort(cmp);
    for (const t of thirdPlaced.slice(0, R32_BEST_THIRDS_TOTAL)) {
      qualifiers.add(t.teamId);
    }
    return qualifiers;
  }

  /**
   * Una vez que terminó la fase de grupos, puntúa los picks R32 que están
   * sin scorear. Suma POINTS_R32_QUALIFIER por cada equipo acertado al total
   * del usuario en cada GroupScore (sin tocar streak). Idempotente.
   */
  async scoreR32PicksIfReady(
    tournamentId: string,
  ): Promise<{ scored: number; usersAffected: number }> {
    const qualifiers = await this.computeR32Qualifiers(tournamentId);
    if (!qualifiers) return { scored: 0, usersAffected: 0 };

    const unscored = await this.prisma.r32QualifierPick.findMany({
      where: { tournamentId, pointsEarned: null },
      select: { id: true, userId: true, teamId: true },
    });
    if (!unscored.length) return { scored: 0, usersAffected: 0 };

    const pointsByUser = new Map<string, number>();
    const updates: Promise<unknown>[] = [];
    for (const pick of unscored) {
      const correct = qualifiers.has(pick.teamId);
      const earned = correct ? POINTS_R32_QUALIFIER : 0;
      updates.push(
        this.prisma.r32QualifierPick.update({
          where: { id: pick.id },
          data: { pointsEarned: earned },
        }),
      );
      if (earned > 0) {
        pointsByUser.set(
          pick.userId,
          (pointsByUser.get(pick.userId) ?? 0) + earned,
        );
      }
    }
    await Promise.all(updates);

    const userIds = [...pointsByUser.keys()];
    if (!userIds.length) return { scored: unscored.length, usersAffected: 0 };

    const memberships = await this.prisma.groupMember.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, groupId: true },
    });
    for (const m of memberships) {
      const pts = pointsByUser.get(m.userId) ?? 0;
      if (pts <= 0) continue;
      const existing = await this.prisma.groupScore.findUnique({
        where: {
          groupId_userId_tournamentId: {
            groupId: m.groupId,
            userId: m.userId,
            tournamentId,
          },
        },
      });
      if (existing) {
        await this.prisma.groupScore.update({
          where: { id: existing.id },
          data: { total: existing.total + pts },
        });
      } else {
        await this.prisma.groupScore.create({
          data: {
            userId: m.userId,
            groupId: m.groupId,
            tournamentId,
            total: pts,
            streak: 0,
          },
        });
      }
    }

    return { scored: unscored.length, usersAffected: userIds.length };
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
