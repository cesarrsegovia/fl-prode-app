import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ActiveMatch,
  RemoteResult,
  RemoteStandingGroup,
  RemoteStandingTeam,
  ResultsProvider,
} from './results-provider';
import { statusFromEspn } from './espn.util';

const DEFAULT_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
// El endpoint de standings vive bajo /apis/v2 (no /apis/site/v2).
const DEFAULT_STANDINGS_BASE =
  'https://site.api.espn.com/apis/v2/sports/soccer/fifa.world';
const UA = 'Mozilla/5.0 (compatible; ProdeBot/1.0)';

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Lee un stat por su `name` del array de stats de ESPN; 0 si falta. */
function statValue(stats: any[], name: string): number {
  const s = (stats ?? []).find((x) => x?.name === name);
  return toInt(s?.value) ?? 0;
}

/** YYYYMMDD en UTC a partir de una Date. */
function espnDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

@Injectable()
export class EspnResultsProvider implements ResultsProvider {
  private readonly logger = new Logger(EspnResultsProvider.name);
  private readonly base = (process.env.ESPN_SCOREBOARD_URL || DEFAULT_BASE).replace(/\/+$/, '');
  private readonly standingsBase = (
    process.env.ESPN_STANDINGS_URL || DEFAULT_STANDINGS_BASE
  ).replace(/\/+$/, '');

  /** Parseo puro de un JSON de scoreboard de ESPN a RemoteResult[]. */
  static parseScoreboard(json: any): RemoteResult[] {
    const events: any[] = json?.events ?? [];
    const out: RemoteResult[] = [];
    for (const ev of events) {
      const comp = ev?.competitions?.[0];
      const competitors: any[] = comp?.competitors ?? [];
      const home = competitors.find((c) => c?.homeAway === 'home');
      const away = competitors.find((c) => c?.homeAway === 'away');
      if (!home || !away) continue;
      const type = ev?.status?.type ?? {};
      // Penales: en partidos definidos por tanda, ESPN trae `shootoutScore` en
      // cada competidor (y status.type.name = STATUS_FINAL_PEN). El `score`
      // sigue siendo el del tiempo jugado (90' o 120'). Si no hubo penales,
      // shootoutScore viene null/undefined.
      out.push({
        externalId: String(ev.id),
        status: statusFromEspn(type.state ?? '', type.name ?? '', !!type.completed),
        homeScore: toInt(home.score),
        awayScore: toInt(away.score),
        homePens: toInt(home.shootoutScore),
        awayPens: toInt(away.shootoutScore),
        homeAbbr: home.team?.abbreviation ?? null,
        awayAbbr: away.team?.abbreviation ?? null,
        startTime: ev.date ?? null,
      });
    }
    return out;
  }

  /** Parseo puro del JSON de standings de ESPN a RemoteStandingGroup[]. */
  static parseStandings(json: any): RemoteStandingGroup[] {
    const children: any[] = json?.children ?? [];
    const out: RemoteStandingGroup[] = [];
    for (const group of children) {
      const entries: any[] = group?.standings?.entries ?? [];
      const teams: RemoteStandingTeam[] = [];
      for (const entry of entries) {
        const abbr = entry?.team?.abbreviation;
        if (!abbr) continue;
        const stats = entry?.stats ?? [];
        teams.push({
          teamAbbr: String(abbr),
          played: statValue(stats, 'gamesPlayed'),
          won: statValue(stats, 'wins'),
          drawn: statValue(stats, 'draws'),
          lost: statValue(stats, 'losses'),
          goalsFor: statValue(stats, 'pointsFor'),
          goalsAgainst: statValue(stats, 'pointsAgainst'),
          goalDiff: statValue(stats, 'pointDifferential'),
          points: statValue(stats, 'points'),
          position: statValue(stats, 'rank'),
        });
      }
      out.push({ groupName: group?.name ?? '', teams });
    }
    return out;
  }

  async fetchStandings(): Promise<RemoteStandingGroup[]> {
    try {
      const res = await axios.get(`${this.standingsBase}/standings`, {
        headers: { 'User-Agent': UA },
        timeout: 10_000,
      });
      return EspnResultsProvider.parseStandings(res.data);
    } catch (err: any) {
      this.logger.error(`ESPN standings fetch failed: ${err.message}`);
      return [];
    }
  }

  async fetchResults(activeMatches: ActiveMatch[]): Promise<RemoteResult[]> {
    // Por cada partido consultamos su día UTC y el anterior y el siguiente:
    // un partido nocturno puede aparecer listado en ESPN bajo el día contiguo
    // según la zona horaria. Las fechas se deduplican.
    const DAY_MS = 24 * 60 * 60 * 1000;
    const dates = Array.from(
      new Set(
        activeMatches.flatMap((m) => [
          espnDate(new Date(m.startTime.getTime() - DAY_MS)),
          espnDate(m.startTime),
          espnDate(new Date(m.startTime.getTime() + DAY_MS)),
        ]),
      ),
    );
    const results: RemoteResult[] = [];
    for (const date of dates) {
      try {
        const res = await axios.get(`${this.base}/scoreboard`, {
          params: { dates: date },
          headers: { 'User-Agent': UA },
          timeout: 10_000,
        });
        results.push(...EspnResultsProvider.parseScoreboard(res.data));
      } catch (err: any) {
        this.logger.error(`ESPN scoreboard fetch failed for ${date}: ${err.message}`);
      }
    }
    return results;
  }
}
