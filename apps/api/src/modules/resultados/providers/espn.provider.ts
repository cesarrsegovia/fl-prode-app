import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ActiveMatch,
  RemoteResult,
  ResultsProvider,
} from './results-provider';
import { statusFromEspn } from './espn.util';

const DEFAULT_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world';
const UA = 'Mozilla/5.0 (compatible; ProdeBot/1.0)';

function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** YYYYMMDD en UTC a partir de una Date. */
function espnDate(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}

@Injectable()
export class EspnResultsProvider implements ResultsProvider {
  private readonly logger = new Logger(EspnResultsProvider.name);
  private readonly base = (process.env.ESPN_SCOREBOARD_URL || DEFAULT_BASE).replace(/\/+$/, '');

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
      out.push({
        externalId: String(ev.id),
        status: statusFromEspn(type.state ?? '', type.name ?? '', !!type.completed),
        homeScore: toInt(home.score),
        awayScore: toInt(away.score),
      });
    }
    return out;
  }

  async fetchResults(activeMatches: ActiveMatch[]): Promise<RemoteResult[]> {
    const dates = Array.from(new Set(activeMatches.map((m) => espnDate(m.startTime))));
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
