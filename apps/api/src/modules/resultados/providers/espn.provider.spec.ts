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
            { homeAway: 'home', score: '2', team: { abbreviation: 'CAN' } },
            { homeAway: 'away', score: '1', team: { abbreviation: 'BIH' } },
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
    {
      // Partido de eliminación definido por penales (datos reales de ESPN:
      // status STATUS_FINAL_PEN, score = tiempo jugado, shootoutScore = tanda).
      id: '633850',
      date: '2026-07-04T19:00Z',
      status: { type: { state: 'post', name: 'STATUS_FINAL_PEN', completed: true } },
      competitions: [
        {
          competitors: [
            { homeAway: 'home', score: '3', shootoutScore: 4, team: { abbreviation: 'ARG' } },
            { homeAway: 'away', score: '3', shootoutScore: 2, team: { abbreviation: 'FRA' } },
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
      homePens: null,
      awayPens: null,
      homeAbbr: 'CAN',
      awayAbbr: 'BIH',
      startTime: '2026-06-12T19:00Z',
    });
    const pending = out.find((r) => r.externalId === '760417');
    expect(pending?.status).toBe(MatchStatus.PENDING);
    expect(pending?.homeScore).toBe(0);
  });

  it('parsea penales (shootoutScore) en partidos de eliminación', () => {
    const out = EspnResultsProvider.parseScoreboard(SAMPLE);
    const pen = out.find((r) => r.externalId === '633850');
    expect(pen?.status).toBe(MatchStatus.FINISHED);
    expect(pen?.homeScore).toBe(3);
    expect(pen?.awayScore).toBe(3);
    expect(pen?.homePens).toBe(4);
    expect(pen?.awayPens).toBe(2);
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

const STANDINGS_SAMPLE = {
  children: [
    {
      name: 'Group A',
      standings: {
        entries: [
          {
            team: { abbreviation: 'MEX' },
            stats: [
              { name: 'gamesPlayed', value: 2 },
              { name: 'wins', value: 2 },
              { name: 'draws', value: 0 },
              { name: 'losses', value: 0 },
              { name: 'pointsFor', value: 5 },
              { name: 'pointsAgainst', value: 1 },
              { name: 'pointDifferential', value: 4 },
              { name: 'points', value: 6 },
              { name: 'rank', value: 1 },
            ],
          },
          {
            team: { abbreviation: 'CAN' },
            stats: [
              { name: 'gamesPlayed', value: 2 },
              { name: 'wins', value: 0 },
              { name: 'draws', value: 1 },
              { name: 'losses', value: 1 },
              { name: 'pointsFor', value: 1 },
              { name: 'pointsAgainst', value: 3 },
              { name: 'pointDifferential', value: -2 },
              { name: 'points', value: 1 },
              { name: 'rank', value: 2 },
            ],
          },
        ],
      },
    },
  ],
};

describe('EspnResultsProvider.parseStandings', () => {
  it('mapea children/entries a RemoteStandingGroup con stats por name y position=rank', () => {
    const out = EspnResultsProvider.parseStandings(STANDINGS_SAMPLE);
    expect(out).toHaveLength(1);
    expect(out[0].groupName).toBe('Group A');
    expect(out[0].teams).toContainEqual({
      teamAbbr: 'MEX',
      played: 2,
      won: 2,
      drawn: 0,
      lost: 0,
      goalsFor: 5,
      goalsAgainst: 1,
      goalDiff: 4,
      points: 6,
      position: 1,
    });
    const can = out[0].teams.find((t) => t.teamAbbr === 'CAN');
    expect(can?.position).toBe(2);
    expect(can?.goalDiff).toBe(-2);
  });

  it('JSON vacío / sin children -> []', () => {
    expect(EspnResultsProvider.parseStandings({})).toEqual([]);
    expect(EspnResultsProvider.parseStandings(null)).toEqual([]);
  });

  it('saltea entries sin abbreviation sin romper', () => {
    const out = EspnResultsProvider.parseStandings({
      children: [{ name: 'Group B', standings: { entries: [{ team: {}, stats: [] }] } }],
    });
    expect(out).toEqual([{ groupName: 'Group B', teams: [] }]);
  });
});
