import { MatchStatus } from '@prisma/client';
import { matchRemoteToLocal, type MatchableLocal } from './match-remote';
import type { RemoteResult } from './results-provider';

const local = (over: Partial<MatchableLocal> = {}): MatchableLocal => ({
  id: 'local-1',
  externalId: 'wc-m004',
  startTime: new Date('2026-06-13T01:00:00.000Z'),
  homeAbbr: 'USA',
  awayAbbr: 'PAR',
  ...over,
});

const remote = (over: Partial<RemoteResult> = {}): RemoteResult => ({
  externalId: '760417',
  status: MatchStatus.FINISHED,
  homeScore: 4,
  awayScore: 1,
  homeAbbr: 'USA',
  awayAbbr: 'PAR',
  startTime: '2026-06-13T01:00:00.000Z',
  ...over,
});

describe('matchRemoteToLocal', () => {
  it('matchea por externalId exacto (caso API-Football)', () => {
    const locals = [local({ externalId: '760417' })];
    expect(matchRemoteToLocal(locals, remote())?.id).toBe('local-1');
  });

  it('matchea por abreviaturas + startTime cuando el externalId no coincide (caso ESPN)', () => {
    const locals = [local()]; // externalId local = wc-m004, remoto = 760417
    expect(matchRemoteToLocal(locals, remote())?.id).toBe('local-1');
  });

  it('no matchea si las abreviaturas difieren', () => {
    const locals = [local({ homeAbbr: 'BRA', awayAbbr: 'MAR' })];
    expect(matchRemoteToLocal(locals, remote())).toBeNull();
  });

  it('no matchea si el startTime difiere', () => {
    const locals = [local({ startTime: new Date('2026-06-20T01:00:00.000Z') })];
    expect(matchRemoteToLocal(locals, remote())).toBeNull();
  });

  it('compara abreviaturas sin distinguir mayúsculas', () => {
    const locals = [local({ homeAbbr: 'usa', awayAbbr: 'par' })];
    expect(matchRemoteToLocal(locals, remote())?.id).toBe('local-1');
  });

  it('prefiere el match por externalId aunque otro coincida por abreviaturas', () => {
    const locals = [
      local({ id: 'by-abbr' }),
      local({ id: 'by-id', externalId: '760417', homeAbbr: 'XXX', awayAbbr: 'YYY' }),
    ];
    expect(matchRemoteToLocal(locals, remote())?.id).toBe('by-id');
  });

  it('devuelve null si el remoto no trae abbr ni id coincidente', () => {
    const locals = [local()];
    const r = remote({ externalId: '999', homeAbbr: null, awayAbbr: null });
    expect(matchRemoteToLocal(locals, r)).toBeNull();
  });
});
