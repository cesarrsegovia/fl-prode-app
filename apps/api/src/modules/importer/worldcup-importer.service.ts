import { Injectable, Logger } from '@nestjs/common';
import {
  MatchStage,
  TournamentType,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { statusFromApiFootball } from '../../common/utils/api-football.util';
import {
  AFFixture,
  ApiFootballClient,
} from './api-football.client';

/**
 * Importador idempotente del Mundial 2026 desde API-Football.
 * Idempotente: reejecutar no duplica datos.
 */

const LEAGUE_ID = 1;
const SEASON = 2026;

const ROUND_TO_STAGE: Array<{ test: RegExp; stage: MatchStage; round: number; name: string }> = [
  { test: /group stage\s*-\s*1/i, stage: MatchStage.GROUP, round: 1, name: 'Fase de Grupos · Fecha 1' },
  { test: /group stage\s*-\s*2/i, stage: MatchStage.GROUP, round: 2, name: 'Fase de Grupos · Fecha 2' },
  { test: /group stage\s*-\s*3/i, stage: MatchStage.GROUP, round: 3, name: 'Fase de Grupos · Fecha 3' },
  { test: /round of 32/i, stage: MatchStage.R32, round: 4, name: 'Treintaidosavos de Final' },
  { test: /round of 16/i, stage: MatchStage.R16, round: 5, name: 'Octavos de Final' },
  { test: /quarter[- ]?final/i, stage: MatchStage.QUARTERFINAL, round: 6, name: 'Cuartos de Final' },
  { test: /semi[- ]?final/i, stage: MatchStage.SEMIFINAL, round: 7, name: 'Semifinales' },
  { test: /3rd|third place|tercer/i, stage: MatchStage.THIRD_PLACE, round: 8, name: 'Tercer Puesto' },
  { test: /^\s*final\s*$/i, stage: MatchStage.FINAL, round: 9, name: 'Final' },
];

function classifyRound(round: string) {
  return (
    ROUND_TO_STAGE.find((r) => r.test.test(round)) ?? {
      stage: MatchStage.GROUP,
      round: 1,
      name: round,
    }
  );
}

export interface ImportSummary {
  tournamentId: string;
  teamsImported: number;
  venuesImported: number;
  groupsImported: number;
  matchesImported: number;
  playersImported: number;
  fixturesImported: number;
  apiRequestsUsed: number;
  warnings: string[];
}

interface ImportContext {
  client: ApiFootballClient;
  warnings: string[];
  apiRequests: number;
  tournamentId: string;
  teamByExternal: Map<number, string>;
  groupByName: Map<string, string>;
  teamGroupAssignment: Map<number, string>;
  venueByExternal: Map<number, string>;
  fixtureByRound: Map<number, string>;
}

@Injectable()
export class WorldCupImporterService {
  private readonly logger = new Logger(WorldCupImporterService.name);

  constructor(private readonly prisma: PrismaService) {}

  async importWorldCup2026(options: { withSquads?: boolean } = {}): Promise<ImportSummary> {
    const apiKey = process.env.SPORTS_API_KEY;
    const apiUrl = process.env.SPORTS_API_URL;
    if (!apiKey || !apiUrl) {
      throw new Error(
        'SPORTS_API_KEY/SPORTS_API_URL no configurados. Registrate en api-sports.io para obtener la key.',
      );
    }

    const ctx: ImportContext = {
      client: new ApiFootballClient(apiKey, apiUrl),
      warnings: [],
      apiRequests: 0,
      tournamentId: '',
      teamByExternal: new Map(),
      groupByName: new Map(),
      teamGroupAssignment: new Map(),
      venueByExternal: new Map(),
      fixtureByRound: new Map(),
    };

    this.logger.log('1/6 metadata del torneo...');
    ctx.tournamentId = await this.importTournament(ctx);

    this.logger.log('2/6 equipos...');
    await this.importTeams(ctx);

    this.logger.log('3/6 grupos y standings...');
    await this.importGroupsAndStandings(ctx);
    await this.linkTournamentTeams(ctx);

    this.logger.log('4/6 partidos, fixtures y estadios...');
    const fixtures = await ctx.client.fixtures(LEAGUE_ID, SEASON);
    ctx.apiRequests++;
    await this.importVenues(ctx, fixtures);
    await this.importFixturesAndMatches(ctx, fixtures);

    let playersImported = 0;
    if (options.withSquads) {
      this.logger.log(`5/6 plantillas (${ctx.teamByExternal.size} selecciones)...`);
      playersImported = await this.importSquads(ctx);
    } else {
      this.logger.log('5/6 plantillas omitidas (withSquads=false)');
    }

    this.logger.log('6/6 listo');

    return {
      tournamentId: ctx.tournamentId,
      teamsImported: ctx.teamByExternal.size,
      venuesImported: ctx.venueByExternal.size,
      groupsImported: ctx.groupByName.size,
      matchesImported: fixtures.length,
      playersImported,
      fixturesImported: ctx.fixtureByRound.size,
      apiRequestsUsed: ctx.apiRequests,
      warnings: ctx.warnings,
    };
  }

  // -------------------------------------------------------------------------
  // Etapas
  // -------------------------------------------------------------------------

  private async importTournament(ctx: ImportContext): Promise<string> {
    const leagues = await ctx.client.league(LEAGUE_ID, SEASON);
    ctx.apiRequests++;
    if (!leagues.length) {
      throw new Error('API-Football no devolvió la league del Mundial 2026. Verificá tu plan.');
    }
    const meta = leagues[0];
    const seasonInfo = meta.seasons.find((s) => s.year === SEASON) ?? meta.seasons[0];

    const data: Prisma.TournamentUncheckedUpdateInput = {
      name: meta.league.name,
      type: TournamentType.INTERNATIONAL,
      country: meta.country.name,
      startDate: seasonInfo?.start ? new Date(seasonInfo.start) : null,
      endDate: seasonInfo?.end ? new Date(seasonInfo.end) : null,
      logoUrl: meta.league.logo,
      isActive: true,
    };

    const externalId = `${LEAGUE_ID}-${SEASON}`;
    const tournament = await this.prisma.tournament.upsert({
      where: { externalId },
      update: data,
      create: { externalId, ...(data as Prisma.TournamentUncheckedCreateInput) },
    });

    await this.prisma.tournament.updateMany({
      where: { id: { not: tournament.id }, isActive: true },
      data: { isActive: false },
    });
    return tournament.id;
  }

  private async importTeams(ctx: ImportContext): Promise<void> {
    const teams = await ctx.client.teams(LEAGUE_ID, SEASON);
    ctx.apiRequests++;

    const results = await Promise.all(
      teams.map(async (t) => {
        const data: Prisma.TeamUncheckedUpdateInput = {
          name: t.team.name,
          shortName: t.team.code ?? undefined,
          code: t.team.code ?? undefined,
          flagUrl: t.team.logo,
          logoUrl: t.team.logo,
          founded: t.team.founded ?? undefined,
        };
        const externalId = String(t.team.id);
        const team = await this.prisma.team.upsert({
          where: { externalId },
          update: data,
          create: { externalId, ...(data as Prisma.TeamUncheckedCreateInput) },
        });
        return [t.team.id, team.id] as const;
      }),
    );

    for (const [afId, dbId] of results) ctx.teamByExternal.set(afId, dbId);
  }

  private async importGroupsAndStandings(ctx: ImportContext): Promise<void> {
    const standingsList = await ctx.client.standings(LEAGUE_ID, SEASON);
    ctx.apiRequests++;
    if (!standingsList.length) {
      ctx.warnings.push('No vinieron standings; los grupos quedan sin asignar hasta la próxima corrida.');
      return;
    }

    const standings = standingsList[0];
    for (const groupArr of standings.league.standings) {
      if (!groupArr.length) continue;
      const groupLabel = groupArr[0].group;
      const groupName = groupLabel.replace(/^Group\s+/i, '').trim();
      const dbGroup = await this.prisma.tournamentGroup.upsert({
        where: { tournamentId_name: { tournamentId: ctx.tournamentId, name: groupName } },
        update: {},
        create: { tournamentId: ctx.tournamentId, name: groupName },
      });
      ctx.groupByName.set(groupName, dbGroup.id);

      await Promise.all(
        groupArr.map(async (row) => {
          const teamId = ctx.teamByExternal.get(row.team.id);
          if (!teamId) {
            ctx.warnings.push(`Team ${row.team.id} de standings ${groupLabel} sin local id; skip standing.`);
            return;
          }
          ctx.teamGroupAssignment.set(row.team.id, groupName);
          const standingData: Prisma.GroupStandingUncheckedUpdateInput = {
            played: row.all.played,
            won: row.all.win,
            drawn: row.all.draw,
            lost: row.all.lose,
            goalsFor: row.all.goals.for,
            goalsAgainst: row.all.goals.against,
            goalDiff: row.goalsDiff,
            points: row.points,
            position: row.rank,
          };
          await this.prisma.groupStanding.upsert({
            where: { groupId_teamId: { groupId: dbGroup.id, teamId } },
            update: standingData,
            create: {
              ...(standingData as Prisma.GroupStandingUncheckedCreateInput),
              tournamentId: ctx.tournamentId,
              groupId: dbGroup.id,
              teamId,
            },
          });
        }),
      );
    }
  }

  private async linkTournamentTeams(ctx: ImportContext): Promise<void> {
    await Promise.all(
      [...ctx.teamByExternal.entries()].map(async ([afTeamId, teamId]) => {
        const groupName = ctx.teamGroupAssignment.get(afTeamId);
        const groupId = groupName ? ctx.groupByName.get(groupName) : undefined;
        await this.prisma.tournamentTeam.upsert({
          where: { tournamentId_teamId: { tournamentId: ctx.tournamentId, teamId } },
          update: { groupId },
          create: { tournamentId: ctx.tournamentId, teamId, groupId },
        });
      }),
    );
  }

  private async importVenues(ctx: ImportContext, fixtures: AFFixture[]): Promise<void> {
    const uniqueVenueIds = new Set<number>();
    for (const f of fixtures) {
      if (f.fixture.venue.id) uniqueVenueIds.add(f.fixture.venue.id);
    }

    const fetched = await Promise.allSettled(
      [...uniqueVenueIds].map(async (vid) => {
        const res = await ctx.client.venue(vid);
        return { vid, detail: res[0] ?? null };
      }),
    );
    ctx.apiRequests += uniqueVenueIds.size;

    await Promise.all(
      fetched.map(async (r) => {
        if (r.status === 'rejected') {
          ctx.warnings.push(`Venue fetch fail: ${r.reason?.message ?? r.reason}`);
          return;
        }
        const { vid, detail } = r.value;
        if (!detail) return;
        const data: Prisma.VenueUncheckedUpdateInput = {
          name: detail.name,
          city: detail.city,
          country: detail.country,
          capacity: detail.capacity ?? undefined,
          imageUrl: detail.image ?? undefined,
          surface: detail.surface ?? undefined,
        };
        const externalId = String(vid);
        const dbVenue = await this.prisma.venue.upsert({
          where: { externalId },
          update: data,
          create: { externalId, ...(data as Prisma.VenueUncheckedCreateInput) },
        });
        ctx.venueByExternal.set(vid, dbVenue.id);
      }),
    );
  }

  private async importFixturesAndMatches(ctx: ImportContext, fixtures: AFFixture[]): Promise<void> {
    const byRound = new Map<number, AFFixture[]>();
    for (const fx of fixtures) {
      const c = classifyRound(fx.league.round);
      const arr = byRound.get(c.round) ?? [];
      arr.push(fx);
      byRound.set(c.round, arr);
    }

    // Crear Fixtures (matchdays)
    await Promise.all(
      [...byRound.entries()].map(async ([round, items]) => {
        const c = classifyRound(items[0].league.round);
        const firstKickoff = items
          .map((i) => new Date(i.fixture.date))
          .reduce((min, d) => (d < min ? d : min), new Date(items[0].fixture.date));
        const dbFixture = await this.prisma.fixture.upsert({
          where: { tournamentId_round: { tournamentId: ctx.tournamentId, round } },
          update: { closeAt: firstKickoff, name: c.name },
          create: {
            tournamentId: ctx.tournamentId,
            round,
            closeAt: firstKickoff,
            name: c.name,
          },
        });
        ctx.fixtureByRound.set(round, dbFixture.id);
      }),
    );

    // Crear Matches (paralelizable, son independientes entre sí)
    await Promise.all(
      fixtures.map((fx) => this.upsertMatch(ctx, fx)),
    );
  }

  private async upsertMatch(ctx: ImportContext, fx: AFFixture): Promise<void> {
    const c = classifyRound(fx.league.round);
    const fixtureId = ctx.fixtureByRound.get(c.round);
    if (!fixtureId) {
      ctx.warnings.push(`Match ${fx.fixture.id} sin fixture local (round ${c.round}); skip.`);
      return;
    }

    const homeTeamId = fx.teams.home.id ? ctx.teamByExternal.get(fx.teams.home.id) : undefined;
    const awayTeamId = fx.teams.away.id ? ctx.teamByExternal.get(fx.teams.away.id) : undefined;

    let groupId: string | undefined;
    if (c.stage === MatchStage.GROUP && fx.teams.home.id && fx.teams.away.id) {
      const gh = ctx.teamGroupAssignment.get(fx.teams.home.id);
      const ga = ctx.teamGroupAssignment.get(fx.teams.away.id);
      if (gh && gh === ga) groupId = ctx.groupByName.get(gh);
    }

    const venueId =
      fx.fixture.venue.id ? ctx.venueByExternal.get(fx.fixture.venue.id) : undefined;

    const data: Prisma.MatchUncheckedUpdateInput = {
      tournamentId: ctx.tournamentId,
      fixtureId,
      stage: c.stage,
      groupId,
      venueId,
      homeTeamId,
      awayTeamId,
      homeTeamName: fx.teams.home.name,
      awayTeamName: fx.teams.away.name,
      startTime: new Date(fx.fixture.date),
      status: statusFromApiFootball(fx.fixture.status.short),
      homeScore: fx.score.fulltime.home ?? fx.goals.home ?? undefined,
      awayScore: fx.score.fulltime.away ?? fx.goals.away ?? undefined,
      homeScoreET: fx.score.extratime.home ?? undefined,
      awayScoreET: fx.score.extratime.away ?? undefined,
      homePens: fx.score.penalty.home ?? undefined,
      awayPens: fx.score.penalty.away ?? undefined,
      refereeName: fx.fixture.referee ?? undefined,
    };

    const externalId = String(fx.fixture.id);
    await this.prisma.match.upsert({
      where: { externalId },
      update: data,
      create: { externalId, ...(data as Prisma.MatchUncheckedCreateInput) },
    });
  }

  private async importSquads(ctx: ImportContext): Promise<number> {
    let playersImported = 0;
    const results = await Promise.allSettled(
      [...ctx.teamByExternal.entries()].map(async ([afTeamId, teamId]) => {
        const squad = await ctx.client.squad(afTeamId);
        if (!squad.length) return 0;
        let count = 0;
        for (const p of squad[0].players) {
          const playerData: Prisma.PlayerUncheckedUpdateInput = {
            name: p.name,
            position: p.position ?? undefined,
            number: p.number ?? undefined,
            photoUrl: p.photo ?? undefined,
            age: p.age ?? undefined,
          };
          const playerExternalId = String(p.id);
          const player = await this.prisma.player.upsert({
            where: { externalId: playerExternalId },
            update: playerData,
            create: { externalId: playerExternalId, ...(playerData as Prisma.PlayerUncheckedCreateInput) },
          });
          await this.prisma.squadEntry.upsert({
            where: {
              tournamentId_teamId_playerId: {
                tournamentId: ctx.tournamentId,
                teamId,
                playerId: player.id,
              },
            },
            update: {},
            create: {
              tournamentId: ctx.tournamentId,
              teamId,
              playerId: player.id,
            },
          });
          count++;
        }
        return count;
      }),
    );
    ctx.apiRequests += ctx.teamByExternal.size;

    for (const r of results) {
      if (r.status === 'fulfilled') playersImported += r.value;
      else ctx.warnings.push(`Squad fail: ${r.reason?.message ?? r.reason}`);
    }
    return playersImported;
  }
}
