import { MatchStatus } from '@prisma/client';
import { statusFromEspn } from './espn.util';

describe('statusFromEspn', () => {
  it('post / completed -> FINISHED', () => {
    expect(statusFromEspn('post', 'STATUS_FULL_TIME', true)).toBe(MatchStatus.FINISHED);
    expect(statusFromEspn('post', 'STATUS_FINAL', false)).toBe(MatchStatus.FINISHED);
  });
  it('in -> LIVE', () => {
    expect(statusFromEspn('in', 'STATUS_FIRST_HALF', false)).toBe(MatchStatus.LIVE);
  });
  it('postponed / canceled -> CANCELLED', () => {
    expect(statusFromEspn('pre', 'STATUS_POSTPONED', false)).toBe(MatchStatus.CANCELLED);
    expect(statusFromEspn('pre', 'STATUS_CANCELED', false)).toBe(MatchStatus.CANCELLED);
  });
  it('pre / desconocido -> PENDING', () => {
    expect(statusFromEspn('pre', 'STATUS_SCHEDULED', false)).toBe(MatchStatus.PENDING);
    expect(statusFromEspn('', '', false)).toBe(MatchStatus.PENDING);
  });
});
