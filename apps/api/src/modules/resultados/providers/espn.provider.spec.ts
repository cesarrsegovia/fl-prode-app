import { MatchStatus } from '@prisma/client';
import { EspnResultsProvider } from './espn.provider';

const SAMPLE = {
  events: [
    {
      id: '760416',
      date: '2026-06-12T19:00Z',
      status: { type: { state: 'post', name: 'STATUS_FULL_TIME', completed: true } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '2' },
            { homeAway: 'away', score: '1' },
          ],
        },
      ],
    },
    {
      id: '760417',
      date: '2026-06-12T22:00Z',
      status: { type: { state: 'pre', name: 'STATUS_SCHEDULED', completed: false } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '0' },
            { homeAway: 'away', score: '0' },
          ],
        },
      ],
    },
  ],
};

describe('EspnResultsProvider.parseScoreboard', () => {
  it('mapea eventos a RemoteResult con score por homeAway y status', () => {
    const out = EspnResultsProvider.parseScoreboard(SAMPLE);
    expect(out).toContainEqual({
      externalId: '760416',
      status: MatchStatus.FINISHED,
      homeScore: 2,
      awayScore: 1,
    });
    const pending = out.find((r) => r.externalId === '760417');
    expect(pending?.status).toBe(MatchStatus.PENDING);
    expect(pending?.homeScore).toBe(0);
  });

  it('saltea eventos sin competitors/score sin romper', () => {
    const out = EspnResultsProvider.parseScoreboard({
      events: [{ id: 'x', status: { type: { state: 'pre', name: '', completed: false } }, competitions: [] }],
    });
    expect(out).toEqual([]);
  });

  it('JSON vacío -> []', () => {
    expect(EspnResultsProvider.parseScoreboard({})).toEqual([]);
    expect(EspnResultsProvider.parseScoreboard(null)).toEqual([]);
  });
});
