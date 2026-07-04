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
  topScorerPickDeadline,
} from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderService } from '../provider/provider.service';
import { ProviderClientError } from '../provider/provider.client';
import { resolveTopScorerPoints } from './top-scorer';
import {
  buildR32Detail,
  type R32QualifiersDetailed,
} from './r32-qualifiers';
import { parseR32Placeholder } from './r32-placeholders';
import {
  parseAdvancePlaceholder,
  knockoutWinnerSide,
  knockoutLoserSide,
} from './knockout-advance';
import { resolveChampionPoints } from './champion';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { planBracketRelink, type RelinkAssignment } from './bracket-relink';
import {
  proposeR32Thirds,
  R32_THIRD_SLOTS,
  R32_THIRD_SLOT_CANDIDATES,
  type R32ThirdSlot,
} from './r32-thirds';

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
      select: { id: true },
    });
    if (!tournament) throw new NotFoundException('Torneo no encontrado');

    const deadline = await this.getChampionDeadline(tournamentId);
    if (deadline && deadline.getTime() <= Date.now()) {
      throw new BadRequestException('El plazo para elegir campeón ya está cerrado.');
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
    const firstStart = await this.getRound3FirstMatchStart(tournamentId);
    if (!firstStart) return null;
    return r32QualifierDeadline(firstStart);
  }

  /** Primer partido de la 3ra fecha de grupos (round=3), o null si no hay fixture. */
  private async getRound3FirstMatchStart(
    tournamentId: string,
  ): Promise<Date | null> {
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
    return round3?.matches[0]?.startTime ?? null;
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
    const detailed = await this.computeR32QualifiersDetailed(tournamentId);
    return detailed ? detailed.qualifiers : null;
  }

  /**
   * Igual que computeR32Qualifiers pero además expone, para cada clasificado,
   * su posición (1°/2°/3°) y grupo — necesario para rellenar las llaves de R32.
   * La lógica de cálculo vive en buildR32Detail (función pura, testeada).
   */
  async computeR32QualifiersDetailed(
    tournamentId: string,
  ): Promise<R32QualifiersDetailed | null> {
    const groupMatches = await this.prisma.match.findMany({
      where: { tournamentId, stage: MatchStage.GROUP },
      select: {
        groupId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        status: true,
        group: { select: { name: true } },
      },
    });
    if (!groupMatches.length) return null;
    // Mantenemos el guard de "todos FINISHED" aquí (buildR32Detail valida los
    // datos pero no el status); si falta terminar algún partido, no hay nada.
    const allFinished = groupMatches.every(
      (m) => m.status === MatchStatus.FINISHED,
    );
    if (!allFinished) return null;

    const groupIdToName = new Map<string, string>();
    for (const m of groupMatches) {
      if (m.groupId && m.group?.name) groupIdToName.set(m.groupId, m.group.name);
    }

    return buildR32Detail(
      groupMatches.map((m) => ({
        groupId: m.groupId,
        homeTeamId: m.homeTeamId,
        awayTeamId: m.awayTeamId,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })),
      groupIdToName,
    );
  }

  /**
   * Rellena las llaves de R32 con los equipos clasificados reales, parseando los
   * placeholders sembrados ("1° Grupo A", "2° Grupo B", "3° (A/B/C/D/F)").
   *
   * - TOP2 (1°/2° de cada grupo): se resuelven y publican automáticamente.
   * - Terceros: NO se publican solos. Si no hay asignación confirmada por el
   *   admin, se calcula una PROPUESTA y se guarda en Tournament.r32ThirdsAssignment
   *   (sin tocar los Match). Solo si r32ThirdsConfirmed=true se escriben los
   *   lados de tercero en los partidos.
   *
   * Idempotente: solo actualiza los lados que cambian.
   */
  async fillR32Matches(
    tournamentId: string,
  ): Promise<{ filledTop: number; thirdsPending: boolean; thirdsConfirmed: boolean }> {
    const detailed = await this.computeR32QualifiersDetailed(tournamentId);
    if (!detailed) return { filledTop: 0, thirdsPending: false, thirdsConfirmed: false };

    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { r32ThirdsAssignment: true, r32ThirdsConfirmed: true },
    });
    const thirdsConfirmed = tournament?.r32ThirdsConfirmed ?? false;

    // Asegurar que exista una propuesta de terceros si todavía no hay nada.
    if (!tournament?.r32ThirdsAssignment) {
      try {
        const proposal = proposeR32Thirds(detailed.qualifiedThirdGroups);
        await this.prisma.tournament.update({
          where: { id: tournamentId },
          data: { r32ThirdsAssignment: proposal },
        });
      } catch {
        // Si no se puede proponer (combinación no resoluble), seguimos sin
        // terceros; el admin puede asignarlos a mano.
      }
    }

    const matches = await this.prisma.match.findMany({
      where: { tournamentId, stage: MatchStage.R32 },
      select: {
        id: true,
        // code (id estable de siembra), NO externalId: db:map-espn-ids pisa
        // externalId con el event id de ESPN y r32ThirdsAssignment está keyed
        // por el id de siembra (wc-r32-03).
        code: true,
        homeTeamName: true,
        awayTeamName: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    // Mapa teamId -> name real para denormalizar.
    const teamIds = new Set<string>();
    for (const t of detailed.qualifiers) teamIds.add(t);
    const teams = await this.prisma.team.findMany({
      where: { id: { in: [...teamIds] } },
      select: { id: true, name: true },
    });
    const teamName = new Map(teams.map((t) => [t.id, t.name]));

    // Asignación de terceros vigente (solo si está confirmada).
    const thirdAssign =
      (tournament?.r32ThirdsAssignment as Record<string, string> | null) ?? null;

    // Resuelve el teamId de un lado a partir de su placeholder.
    const resolveSide = (
      code: string | null,
      placeholder: string,
    ): string | null => {
      const parsed = parseR32Placeholder(placeholder);
      if (parsed.kind === 'TOP') {
        return detailed.topByGroupPos.get(`${parsed.group}#${parsed.position}`) ?? null;
      }
      if (parsed.kind === 'THIRD') {
        // Solo publicamos terceros si están confirmados por el admin.
        // r32ThirdsAssignment está keyed por el code de siembra (wc-r32-03).
        if (!thirdsConfirmed || !thirdAssign || !code) return null;
        const groupName = thirdAssign[code];
        if (!groupName) return null;
        return detailed.thirdByGroup.get(groupName) ?? null;
      }
      return null;
    };

    const updates: Promise<unknown>[] = [];
    for (const m of matches) {
      const homeTeamId = resolveSide(m.code, m.homeTeamName);
      const awayTeamId = resolveSide(m.code, m.awayTeamName);
      const data: {
        homeTeamId?: string;
        homeTeamName?: string;
        awayTeamId?: string;
        awayTeamName?: string;
      } = {};
      if (homeTeamId && homeTeamId !== m.homeTeamId) {
        data.homeTeamId = homeTeamId;
        data.homeTeamName = teamName.get(homeTeamId) ?? m.homeTeamName;
      }
      if (awayTeamId && awayTeamId !== m.awayTeamId) {
        data.awayTeamId = awayTeamId;
        data.awayTeamName = teamName.get(awayTeamId) ?? m.awayTeamName;
      }
      if (Object.keys(data).length) {
        updates.push(this.prisma.match.update({ where: { id: m.id }, data }));
      }
    }
    await Promise.all(updates);

    return {
      filledTop: updates.length,
      thirdsPending: !thirdsConfirmed,
      thirdsConfirmed,
    };
  }

  /**
   * Propaga el resultado de un partido de eliminación ya terminado a las rondas
   * siguientes: ubica al ganador (y al perdedor, para el 3er puesto) en los
   * cruces que lo referencian por placeholder ("Ganador R32-3", "Perdedor SF-1").
   * Los placeholders se resuelven contra `code` (id estable de siembra, p.ej.
   * "wc-r32-03"), no contra externalId (que db:map-espn-ids puede sobrescribir).
   * Idempotente: solo escribe si el lado cambia. El caller se encarga de
   * invalidar cache y emitir eventos (este service no los tiene inyectados).
   */
  async propagateKnockoutResult(
    tournamentId: string,
    finished: {
      code: string | null;
      homeTeamId: string | null;
      awayTeamId: string | null;
      homeScore: number | null;
      awayScore: number | null;
      homePens: number | null;
      awayPens: number | null;
    },
  ): Promise<{ updated: number }> {
    if (!finished.code) return { updated: 0 };

    const winnerSide = knockoutWinnerSide(
      finished.homeScore,
      finished.awayScore,
      finished.homePens,
      finished.awayPens,
    );
    if (!winnerSide) return { updated: 0 };
    const loserSide = knockoutLoserSide(winnerSide);

    const winnerTeamId =
      winnerSide === 'HOME' ? finished.homeTeamId : finished.awayTeamId;
    const loserTeamId =
      loserSide === 'HOME' ? finished.homeTeamId : finished.awayTeamId;
    if (!winnerTeamId) return { updated: 0 };

    // Candidatos: cualquier knockout del torneo con placeholders todavía sin
    // resolver (pocas filas; se recorre en memoria).
    const matches = await this.prisma.match.findMany({
      where: {
        tournamentId,
        stage: {
          in: [
            MatchStage.R16,
            MatchStage.QUARTERFINAL,
            MatchStage.SEMIFINAL,
            MatchStage.THIRD_PLACE,
            MatchStage.FINAL,
          ],
        },
      },
      select: {
        id: true,
        homeTeamName: true,
        awayTeamName: true,
        homeTeamId: true,
        awayTeamId: true,
      },
    });

    const teamIds = [winnerTeamId];
    if (loserTeamId) teamIds.push(loserTeamId);
    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });
    const teamName = new Map(teams.map((t) => [t.id, t.name]));

    const resolveSide = (
      placeholder: string,
    ): { teamId: string; name: string } | null => {
      const ref = parseAdvancePlaceholder(placeholder);
      if (!ref || ref.sourceCode !== finished.code) return null;
      const teamId = ref.kind === 'WINNER' ? winnerTeamId : loserTeamId;
      if (!teamId) return null;
      return { teamId, name: teamName.get(teamId) ?? placeholder };
    };

    const updates: Promise<unknown>[] = [];
    for (const m of matches) {
      const data: {
        homeTeamId?: string;
        homeTeamName?: string;
        awayTeamId?: string;
        awayTeamName?: string;
      } = {};

      const home = resolveSide(m.homeTeamName);
      if (home && home.teamId !== m.homeTeamId) {
        data.homeTeamId = home.teamId;
        data.homeTeamName = home.name;
      }
      const away = resolveSide(m.awayTeamName);
      if (away && away.teamId !== m.awayTeamId) {
        data.awayTeamId = away.teamId;
        data.awayTeamName = away.name;
      }
      if (Object.keys(data).length) {
        updates.push(this.prisma.match.update({ where: { id: m.id }, data }));
      }
    }
    await Promise.all(updates);
    return { updated: updates.length };
  }

  /**
   * Backfill: recorre todos los knockout FINISHED del torneo y propaga sus
   * resultados. Sirve para reparar o para partidos terminados antes de tener
   * la propagación automática. Devuelve cuántos lados se llenaron.
   */
  async propagateAllKnockoutResults(
    tournamentId: string,
  ): Promise<{ updated: number; processed: number }> {
    const finishedMatches = await this.prisma.match.findMany({
      where: {
        tournamentId,
        status: MatchStatus.FINISHED,
        stage: {
          in: [
            MatchStage.R32,
            MatchStage.R16,
            MatchStage.QUARTERFINAL,
            MatchStage.SEMIFINAL,
          ],
        },
      },
      orderBy: { startTime: 'asc' },
      select: {
        code: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        homePens: true,
        awayPens: true,
      },
    });

    let updated = 0;
    for (const m of finishedMatches) {
      const r = await this.propagateKnockoutResult(tournamentId, m);
      updated += r.updated;
    }
    return { updated, processed: finishedMatches.length };
  }

  /**
   * Reasigna Match.code en torneos donde db:map-espn-ids pisó los externalId
   * de siembra (prod). Lee el JSON de siembra y matchea por stage + horario
   * más cercano. Idempotente; aborta sin escribir ante ambigüedad.
   */
  async relinkBracketCodes(
    tournamentId: string,
  ): Promise<{ total: number; assigned: number; alreadySet: number }> {
    const KO_STAGES = [
      MatchStage.R32,
      MatchStage.R16,
      MatchStage.QUARTERFINAL,
      MatchStage.SEMIFINAL,
      MatchStage.THIRD_PLACE,
      MatchStage.FINAL,
    ];

    const path = resolve(process.cwd(), 'prisma', 'data', 'worldcup-2026.json');
    const data = JSON.parse(readFileSync(path, 'utf-8')) as {
      matches: Array<{ externalId: string; stage: string; startTime: string }>;
    };
    const seedMatches = data.matches
      .filter((m) => (KO_STAGES as string[]).includes(m.stage))
      .map((m) => ({
        code: m.externalId,
        stage: m.stage as MatchStage,
        startTime: new Date(m.startTime),
      }));

    const dbMatches = await this.prisma.match.findMany({
      where: { tournamentId, stage: { in: KO_STAGES } },
      select: { id: true, stage: true, startTime: true, code: true },
    });

    let plan: RelinkAssignment[];
    try {
      plan = planBracketRelink(seedMatches, dbMatches);
    } catch (err) {
      throw new ConflictException((err as Error).message);
    }
    const toWrite = plan.filter((a) => !a.alreadySet);
    await this.prisma.$transaction(
      toWrite.map((a) =>
        this.prisma.match.update({
          where: { id: a.matchId },
          data: { code: a.code },
        }),
      ),
    );
    return {
      total: plan.length,
      assigned: toWrite.length,
      alreadySet: plan.length - toWrite.length,
    };
  }

  /**
   * Devuelve la propuesta de asignación de terceros para que el admin la revise
   * y confirme. Incluye, por slot, el grupo propuesto, el equipo y los grupos
   * candidatos válidos.
   */
  async getR32ThirdsProposal(tournamentId: string) {
    const detailed = await this.computeR32QualifiersDetailed(tournamentId);
    if (!detailed) {
      return { ready: false, slots: [], confirmed: false };
    }
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { r32ThirdsAssignment: true, r32ThirdsConfirmed: true },
    });
    let assignment =
      (tournament?.r32ThirdsAssignment as Record<string, string> | null) ?? null;
    if (!assignment) {
      try {
        assignment = proposeR32Thirds(detailed.qualifiedThirdGroups);
      } catch {
        assignment = null;
      }
    }

    const teamIds = [...detailed.thirdByGroup.values()];
    const teams = await this.prisma.team.findMany({
      where: { id: { in: teamIds } },
      select: { id: true, name: true },
    });
    const teamName = new Map(teams.map((t) => [t.id, t.name]));

    const slots = R32_THIRD_SLOTS.map((slot) => {
      const group = assignment?.[slot] ?? null;
      const teamId = group ? detailed.thirdByGroup.get(group) ?? null : null;
      return {
        slot,
        proposedGroup: group,
        proposedTeamId: teamId,
        proposedTeamName: teamId ? teamName.get(teamId) ?? null : null,
        // candidatos válidos = candidatos del slot que efectivamente clasificaron
        candidateGroups: R32_THIRD_SLOT_CANDIDATES[slot].filter((g) =>
          detailed.qualifiedThirdGroups.includes(g),
        ),
      };
    });

    return {
      ready: true,
      confirmed: tournament?.r32ThirdsConfirmed ?? false,
      qualifiedThirdGroups: detailed.qualifiedThirdGroups,
      slots,
    };
  }

  /**
   * Confirma la asignación de terceros (envía el admin). Valida que cada grupo
   * pertenezca a los candidatos de su slot, que sean 8 grupos distintos y que
   * todos hayan clasificado como terceros. Luego marca confirmado y rellena las
   * llaves de tercero en los Match.
   */
  async confirmR32Thirds(
    tournamentId: string,
    assignment: Record<string, string>,
  ): Promise<{ filledTop: number; thirdsConfirmed: boolean }> {
    const detailed = await this.computeR32QualifiersDetailed(tournamentId);
    if (!detailed) {
      throw new BadRequestException('La fase de grupos todavía no terminó.');
    }
    const qualified = new Set(detailed.qualifiedThirdGroups);
    const slots = R32_THIRD_SLOTS;
    const usedGroups = new Set<string>();

    for (const slot of slots) {
      const group = assignment[slot];
      if (!group) {
        throw new BadRequestException(`Falta asignar el slot ${slot}.`);
      }
      if (!R32_THIRD_SLOT_CANDIDATES[slot as R32ThirdSlot].includes(group)) {
        throw new BadRequestException(
          `El grupo ${group} no es candidato válido para ${slot}.`,
        );
      }
      if (!qualified.has(group)) {
        throw new BadRequestException(
          `El tercero del grupo ${group} no clasificó.`,
        );
      }
      if (usedGroups.has(group)) {
        throw new BadRequestException(`El grupo ${group} está repetido.`);
      }
      usedGroups.add(group);
    }
    if (usedGroups.size !== slots.length) {
      throw new BadRequestException(
        `Hay que asignar exactamente ${slots.length} terceros distintos.`,
      );
    }

    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { r32ThirdsAssignment: assignment, r32ThirdsConfirmed: true },
    });

    const { filledTop } = await this.fillR32Matches(tournamentId);
    return { filledTop, thirdsConfirmed: true };
  }

  /**
   * Una vez que terminó la fase de grupos, puntúa los picks R32 que están
   * sin scorear. Suma POINTS_R32_QUALIFIER por cada equipo acertado al total
   * del usuario, TANTO en el ranking global (UserScore) como en cada GroupScore
   * (sin tocar streak). El global cubre también a los usuarios sin grupo.
   * Idempotente.
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

    // 1) Ranking global (UserScore): por cada usuario que sumó, tenga grupo o no.
    for (const userId of userIds) {
      const pts = pointsByUser.get(userId) ?? 0;
      if (pts <= 0) continue;
      await this.prisma.userScore.upsert({
        where: { userId_tournamentId: { userId, tournamentId } },
        update: { total: { increment: pts } },
        create: { userId, tournamentId, total: pts, streak: 0 },
      });
    }

    // 2) Rankings de grupo (GroupScore): por cada membresía del usuario.
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, groupId: true },
    });
    for (const m of memberships) {
      const pts = pointsByUser.get(m.userId) ?? 0;
      if (pts <= 0) continue;
      await this.prisma.groupScore.upsert({
        where: {
          groupId_userId_tournamentId: {
            groupId: m.groupId,
            userId: m.userId,
            tournamentId,
          },
        },
        update: { total: { increment: pts } },
        create: {
          userId: m.userId,
          groupId: m.groupId,
          tournamentId,
          total: pts,
          streak: 0,
        },
      });
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

  // ---------- Goleador (predicción del top scorer) ----------

  /** Jugadores del torneo (agrupables por equipo / posición). */
  async getTournamentPlayers(tournamentId: string) {
    // Candidatos a goleador: solo jugadores, nunca cuerpo técnico.
    const entries = await this.prisma.squadEntry.findMany({
      where: { tournamentId, player: { isStaff: false } },
      include: {
        player: true,
        team: {
          select: { id: true, name: true, shortName: true, flagUrl: true },
        },
      },
    });
    return entries.map((e) => ({
      playerId: e.playerId,
      name: e.player.name,
      position: e.player.position,
      number: e.player.number,
      photoUrl: e.player.photoUrl,
      team: e.team,
    }));
  }

  async getMyTopScorerPick(tournamentId: string, userId: string) {
    return this.prisma.topScorerPick.findUnique({
      where: { userId_tournamentId: { userId, tournamentId } },
      include: {
        player: {
          select: { id: true, name: true, position: true, photoUrl: true },
        },
      },
    });
  }

  /**
   * Deadline efectivo del pick de goleador: si Tournament.topScorerDeadline
   * está seteado manda ese valor; si no, se puede elegir hasta el final de la
   * 2da fecha de grupos (día previo al primer partido de la 3ra fecha).
   */
  async getTopScorerDeadline(tournamentId: string): Promise<Date | null> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { topScorerDeadline: true },
    });
    if (!tournament) throw new NotFoundException('Torneo no encontrado');
    if (tournament.topScorerDeadline) return tournament.topScorerDeadline;
    const firstStart = await this.getRound3FirstMatchStart(tournamentId);
    if (!firstStart) return null;
    return topScorerPickDeadline(firstStart);
  }

  /** Deadline del pick de campeón: fin de la 2da fecha (día previo al primer partido de la 3ra). */
  async getChampionDeadline(tournamentId: string): Promise<Date | null> {
    const firstStart = await this.getRound3FirstMatchStart(tournamentId);
    if (!firstStart) return null;
    return championPickDeadline(firstStart);
  }

  async setTopScorerPick(
    tournamentId: string,
    userId: string,
    playerId: string,
  ) {
    const deadline = await this.getTopScorerDeadline(tournamentId);
    if (deadline && deadline.getTime() <= Date.now()) {
      throw new BadRequestException(
        'El plazo para elegir goleador ya está cerrado.',
      );
    }

    const squadEntry = await this.prisma.squadEntry.findFirst({
      where: { tournamentId, playerId },
      select: { id: true },
    });
    if (!squadEntry) {
      throw new NotFoundException('El jugador no participa en este torneo');
    }

    return this.prisma.topScorerPick.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      update: { playerId },
      create: { userId, tournamentId, playerId },
      include: {
        player: {
          select: { id: true, name: true, position: true, photoUrl: true },
        },
      },
    });
  }

  /** Admin: marca el goleador ganador del torneo y dispara el scoring. */
  async setTournamentTopScorer(
    tournamentId: string,
    playerId: string | null,
  ) {
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { topScorerPlayerId: playerId },
    });
    if (playerId) {
      return this.scoreTopScorerPicks(tournamentId, playerId);
    }
    return { scored: 0, usersAffected: 0 };
  }

  async scoreTopScorerPicks(tournamentId: string, winningPlayerId: string) {
    const picks = await this.prisma.topScorerPick.findMany({
      where: { tournamentId, pointsEarned: null },
    });

    let scored = 0;
    const usersAffected = new Set<string>();

    for (const pick of picks) {
      const points = resolveTopScorerPoints(pick.playerId, winningPlayerId);
      await this.prisma.topScorerPick.update({
        where: { id: pick.id },
        data: { pointsEarned: points },
      });
      if (points > 0) {
        await this.applyExtraPoints(pick.userId, points, tournamentId);
        usersAffected.add(pick.userId);
      }
      scored++;
    }
    return { scored, usersAffected: usersAffected.size };
  }

  /**
   * Admin: marca el campeón del torneo y dispara el scoring de los BracketPick.
   * También lo llama automáticamente el flujo de resultados cuando termina la
   * final. Idempotente (solo puntúa picks con pointsEarned null).
   */
  async setTournamentChampion(tournamentId: string, teamId: string | null) {
    await this.prisma.tournament.update({
      where: { id: tournamentId },
      data: { championTeamId: teamId },
    });
    if (teamId) {
      return this.scoreBracketPicks(tournamentId, teamId);
    }
    return { scored: 0, usersAffected: 0 };
  }

  async scoreBracketPicks(tournamentId: string, championTeamId: string) {
    const picks = await this.prisma.bracketPick.findMany({
      where: { tournamentId, pointsEarned: null },
    });

    let scored = 0;
    const usersAffected = new Set<string>();

    for (const pick of picks) {
      const points = resolveChampionPoints(pick.champTeamId, championTeamId);
      await this.prisma.bracketPick.update({
        where: { id: pick.id },
        data: { pointsEarned: points },
      });
      if (points > 0) {
        await this.applyExtraPoints(pick.userId, points, tournamentId);
        usersAffected.add(pick.userId);
      }
      scored++;
    }
    return { scored, usersAffected: usersAffected.size };
  }

  /**
   * Suma puntos extra (campeón, goleador) al ranking GLOBAL (UserScore) y a
   * cada GroupScore del usuario. No toca contadores de desempate por partido
   * (esos solo aplican a Predictions). El global cubre también a usuarios sin
   * grupo.
   */
  private async applyExtraPoints(
    userId: string,
    points: number,
    tournamentId: string,
  ) {
    if (points <= 0) return;

    // Ranking global.
    await this.prisma.userScore.upsert({
      where: { userId_tournamentId: { userId, tournamentId } },
      update: { total: { increment: points } },
      create: { userId, tournamentId, total: points, streak: 0 },
    });

    // Rankings por grupo.
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
    });
    for (const m of memberships) {
      await this.prisma.groupScore.upsert({
        where: {
          groupId_userId_tournamentId: {
            groupId: m.groupId,
            userId,
            tournamentId,
          },
        },
        update: { total: { increment: points } },
        create: {
          userId,
          groupId: m.groupId,
          tournamentId,
          total: points,
          streak: 0,
        },
      });
    }
  }
}
