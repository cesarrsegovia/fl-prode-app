import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  ActiveMatch,
  RemoteResult,
  ResultsProvider,
} from './results-provider';
import { statusFromApiFootball } from '../../../common/utils/api-football.util';

interface ApiFixtureResponse {
  fixture: { id: number; status: { short: string } };
  goals: { home: number | null; away: number | null };
  score: {
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

const BATCH_SIZE = 20;

@Injectable()
export class ApiFootballResultsProvider implements ResultsProvider {
  private readonly logger = new Logger(ApiFootballResultsProvider.name);

  async fetchResults(activeMatches: ActiveMatch[]): Promise<RemoteResult[]> {
    const apiKey = process.env.SPORTS_API_KEY;
    const rawUrl = process.env.SPORTS_API_URL;
    if (!apiKey || !rawUrl) {
      this.logger.warn('SPORTS_API_KEY/SPORTS_API_URL no configurados. Skipping.');
      return [];
    }
    const apiUrl = (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`).replace(/\/+$/, '');
    const externalIds = activeMatches.map((m) => m.externalId);
    const out: RemoteResult[] = [];

    for (let i = 0; i < externalIds.length; i += BATCH_SIZE) {
      const chunk = externalIds.slice(i, i + BATCH_SIZE);
      try {
        const res = await axios.get(`${apiUrl}/fixtures`, {
          headers: { 'x-apisports-key': apiKey },
          params: { ids: chunk.join('-') },
          timeout: 10_000,
        });
        const responses: ApiFixtureResponse[] = res.data?.response ?? [];
        for (const fx of responses) {
          out.push({
            externalId: String(fx.fixture.id),
            status: statusFromApiFootball(fx.fixture.status.short),
            homeScore: fx.goals.home ?? null,
            awayScore: fx.goals.away ?? null,
            homeScoreET: fx.score.extratime.home ?? null,
            awayScoreET: fx.score.extratime.away ?? null,
            homePens: fx.score.penalty.home ?? null,
            awayPens: fx.score.penalty.away ?? null,
          });
        }
      } catch (err: any) {
        this.logger.error(`Batch fetch failed: ${err.message}`);
      }
    }
    return out;
  }
}
