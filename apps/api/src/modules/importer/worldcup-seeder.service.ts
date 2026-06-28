import { Injectable, Logger } from '@nestjs/common';
import { MatchStage, Prisma, TournamentType } from '@prisma/client';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  MatchStage as SharedMatchStage,
  groupFixtureDeadline,
  isKnockoutStage,
  knockoutMatchDeadline,
} from '@prode/shared';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Sembrador estático del Mundial 2026 desde apps/api/prisma/data/worldcup-2026.json.
 * Alternativa al WorldCupImporterService cuando no hay acceso al plan paid de API-Football.
 * Idempotente: re-ejecutar no duplica nada.
 */

interface SeedData {
  tournament: {
    externalId: string;
    name: string;
    type: keyof typeof TournamentType;
    country: string | null;
    startDate: string | null;
    endDate: string | null;
    logoUrl: string | null;
    trophyUrl: string | null;
  };
  venues: Array<{
    externalId: string;
    name: string;
    city: string | null;
    country: string | null;
    capacity: number | null;
    imageUrl?: string | null;
  }>;
  teams: Array<{
    externalId: string;
    name: string;
    shortName: string;
    code: string;
    flagUrl: string;
    confederation: string;
  }>;
  groups: Array<{ name: string; teamExternalIds: string[] }>;
  matches: Array<{
    externalId: string;
    stage: keyof typeof MatchStage;
    round: number;
    groupName?: string;
    venueExternalId: string;
    homeTeamExternalId?: string | null;
    awayTeamExternalId?: string | null;
    homeTeamName?: string;
    awayTeamName?: string;
    startTime: string;
  }>;
}

const ROUND_NAMES: Record<number, string> = {
  1: 'Fase de Grupos · Fecha 1',
  2: 'Fase de Grupos · Fecha 2',
  3: 'Fase de Grupos · Fecha 3',
  4: 'Dieciseisavos de Final',
  5: 'Octavos de Final',
  6: 'Cuartos de Final',
  7: 'Semifinales',
  8: 'Tercer Puesto',
  9: 'Final',
};

export interface SeedSummary {
  tournamentId: string;
  teamsImported: number;
  venuesImported: number;
  groupsImported: number;
  fixturesImported: number;
  matchesImported: number;
  warnings: string[];
}

@Injectable()
export class WorldCupSeederService {
  private readonly logger = new Logger(WorldCupSeederService.name);

  constructor(private readonly prisma: PrismaService) {}

  async seed(dataPath?: string): Promise<SeedSummary> {
    const path =
      dataPath ?? resolve(process.cwd(), 'prisma', 'data', 'worldcup-2026.json');
    const data: SeedData = JSON.parse(readFileSync(path, 'utf-8'));

    const warnings: string[] = [];

    this.logger.log('1/5 torneo...');
    const tournamentId = await this.upsertTournament(data);

    this.logger.log('2/5 estadios...');
    const venueIdByExternal = await this.upsertVenues(data);

    this.logger.log('3/5 selecciones...');
    const teamIdByExternal = await this.upsertTeams(data);

    this.logger.log('4/5 grupos y assignments...');
    const groupIdByName = await this.upsertGroups(tournamentId, data, teamIdByExternal, warnings);
    await this.linkTournamentTeams(tournamentId, data, teamIdByExternal, groupIdByName);

    this.logger.log('5/5 fixtures y partidos...');
    const fixtureIdByRound = await this.upsertFixtures(tournamentId, data);
    const matchesImported = await this.upsertMatches(
      tournamentId,
      data,
      fixtureIdByRound,
      teamIdByExternal,
      groupIdByName,
      venueIdByExternal,
      warnings,
    );

    return {
      tournamentId,
      teamsImported: teamIdByExternal.size,
      venuesImported: venueIdByExternal.size,
      groupsImported: groupIdByName.size,
      fixturesImported: fixtureIdByRound.size,
      matchesImported,
      warnings,
    };
  }

  // -------------------------------------------------------------------------

  private async upsertTournament(data: SeedData): Promise<string> {
    const td = data.tournament;
    const fields: Prisma.TournamentUncheckedUpdateInput = {
      name: td.name,
      type: TournamentType[td.type],
      country: td.country,
      startDate: td.startDate ? new Date(td.startDate) : null,
      endDate: td.endDate ? new Date(td.endDate) : null,
      logoUrl: td.logoUrl,
      trophyUrl: td.trophyUrl,
      isActive: true,
    };
    const tournament = await this.prisma.tournament.upsert({
      where: { externalId: td.externalId },
      update: fields,
      create: { externalId: td.externalId, ...(fields as Prisma.TournamentUncheckedCreateInput) },
    });

    await this.prisma.tournament.updateMany({
      where: { id: { not: tournament.id }, isActive: true },
      data: { isActive: false },
    });
    return tournament.id;
  }

  private async upsertVenues(data: SeedData): Promise<Map<string, string>> {
    const results = await Promise.all(
      data.venues.map(async (v) => {
        const fields: Prisma.VenueUncheckedUpdateInput = {
          name: v.name,
          city: v.city,
          country: v.country,
          capacity: v.capacity ?? undefined,
          imageUrl: v.imageUrl ?? undefined,
        };
        const row = await this.prisma.venue.upsert({
          where: { externalId: v.externalId },
          update: fields,
          create: { externalId: v.externalId, ...(fields as Prisma.VenueUncheckedCreateInput) },
        });
        return [v.externalId, row.id] as const;
      }),
    );
    return new Map(results);
  }

  private async upsertTeams(data: SeedData): Promise<Map<string, string>> {
    const results = await Promise.all(
      data.teams.map(async (t) => {
        const fields: Prisma.TeamUncheckedUpdateInput = {
          name: t.name,
          shortName: t.shortName,
          code: t.code,
          flagUrl: t.flagUrl,
          logoUrl: t.flagUrl,
          confederation: t.confederation,
        };
        const row = await this.prisma.team.upsert({
          where: { externalId: t.externalId },
          update: fields,
          create: { externalId: t.externalId, ...(fields as Prisma.TeamUncheckedCreateInput) },
        });
        return [t.externalId, row.id] as const;
      }),
    );
    return new Map(results);
  }

  private async upsertGroups(
    tournamentId: string,
    data: SeedData,
    teamIdByExternal: Map<string, string>,
    warnings: string[],
  ): Promise<Map<string, string>> {
    const groupIdByName = new Map<string, string>();
    for (const g of data.groups) {
      const dbGroup = await this.prisma.tournamentGroup.upsert({
        where: { tournamentId_name: { tournamentId, name: g.name } },
        update: {},
        create: { tournamentId, name: g.name },
      });
      groupIdByName.set(g.name, dbGroup.id);

      for (const teamExternal of g.teamExternalIds) {
        const teamId = teamIdByExternal.get(teamExternal);
        if (!teamId) {
          warnings.push(`Team ${teamExternal} declarado en grupo ${g.name} pero no existe en teams[].`);
        }
      }
    }
    return groupIdByName;
  }

  private async linkTournamentTeams(
    tournamentId: string,
    data: SeedData,
    teamIdByExternal: Map<string, string>,
    groupIdByName: Map<string, string>,
  ): Promise<void> {
    const teamToGroup = new Map<string, string>();
    for (const g of data.groups) {
      for (const teamExt of g.teamExternalIds) teamToGroup.set(teamExt, g.name);
    }

    await Promise.all(
      data.teams.map(async (t) => {
        const teamId = teamIdByExternal.get(t.externalId);
        if (!teamId) return;
        const groupName = teamToGroup.get(t.externalId);
        const groupId = groupName ? groupIdByName.get(groupName) : undefined;
        await this.prisma.tournamentTeam.upsert({
          where: { tournamentId_teamId: { tournamentId, teamId } },
          update: { groupId },
          create: { tournamentId, teamId, groupId },
        });
      }),
    );
  }

  private async upsertFixtures(
    tournamentId: string,
    data: SeedData,
  ): Promise<Map<number, string>> {
    const earliestByRound = new Map<number, { start: Date; stage: MatchStage }>();
    for (const m of data.matches) {
      const t = new Date(m.startTime);
      const cur = earliestByRound.get(m.round);
      if (!cur || t < cur.start) {
        earliestByRound.set(m.round, { start: t, stage: MatchStage[m.stage] });
      }
    }

    const fixtureIdByRound = new Map<number, string>();
    await Promise.all(
      [...earliestByRound.entries()].map(async ([round, { start, stage }]) => {
        const closeAt = isKnockoutStage(stage as unknown as SharedMatchStage)
          ? knockoutMatchDeadline(start)
          : groupFixtureDeadline(start);
        const row = await this.prisma.fixture.upsert({
          where: { tournamentId_round: { tournamentId, round } },
          update: { closeAt, name: ROUND_NAMES[round] ?? `Fecha ${round}` },
          create: {
            tournamentId,
            round,
            closeAt,
            name: ROUND_NAMES[round] ?? `Fecha ${round}`,
          },
        });
        fixtureIdByRound.set(round, row.id);
      }),
    );
    return fixtureIdByRound;
  }

  private async upsertMatches(
    tournamentId: string,
    data: SeedData,
    fixtureIdByRound: Map<number, string>,
    teamIdByExternal: Map<string, string>,
    groupIdByName: Map<string, string>,
    venueIdByExternal: Map<string, string>,
    warnings: string[],
  ): Promise<number> {
    let count = 0;
    await Promise.all(
      data.matches.map(async (m) => {
        const fixtureId = fixtureIdByRound.get(m.round);
        if (!fixtureId) {
          warnings.push(`Match ${m.externalId}: no hay fixture para round ${m.round}.`);
          return;
        }
        const venueId = venueIdByExternal.get(m.venueExternalId);
        if (!venueId) warnings.push(`Match ${m.externalId}: venue ${m.venueExternalId} no encontrado.`);

        const homeTeamId = m.homeTeamExternalId
          ? teamIdByExternal.get(m.homeTeamExternalId)
          : undefined;
        const awayTeamId = m.awayTeamExternalId
          ? teamIdByExternal.get(m.awayTeamExternalId)
          : undefined;

        const groupId = m.groupName ? groupIdByName.get(m.groupName) : undefined;

        const home = homeTeamId
          ? data.teams.find((t) => t.externalId === m.homeTeamExternalId)?.name ?? ''
          : (m.homeTeamName ?? '');
        const away = awayTeamId
          ? data.teams.find((t) => t.externalId === m.awayTeamExternalId)?.name ?? ''
          : (m.awayTeamName ?? '');

        const fields: Prisma.MatchUncheckedUpdateInput = {
          tournamentId,
          fixtureId,
          stage: MatchStage[m.stage],
          groupId,
          venueId,
          homeTeamId,
          awayTeamId,
          homeTeamName: home,
          awayTeamName: away,
          startTime: new Date(m.startTime),
        };

        await this.prisma.match.upsert({
          where: { externalId: m.externalId },
          update: fields,
          create: { externalId: m.externalId, ...(fields as Prisma.MatchUncheckedCreateInput) },
        });
        count++;
      }),
    );
    return count;
  }
}
