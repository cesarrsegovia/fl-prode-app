'use client';

import { useMemo } from 'react';
import type { Match } from '@prode/shared';
import { MatchStatus, Result } from '@prode/shared';

export interface MatchPick {
  result?: Result;
  homeScoreGuess?: number;
  awayScoreGuess?: number;
  isCaptain?: boolean;
}

interface Props {
  match: Match;
  pick?: MatchPick;
  isCaptainOption?: boolean;
  disabled?: boolean;
  onChange: (next: MatchPick) => void;
}

const RESULT_LABELS: Record<Result, string> = {
  [Result.HOME]: '1',
  [Result.DRAW]: 'X',
  [Result.AWAY]: '2',
};

export function MatchCard({
  match,
  pick,
  isCaptainOption,
  disabled,
  onChange,
}: Props) {
  const isLocked =
    disabled ||
    match.status === MatchStatus.LIVE ||
    match.status === MatchStatus.FINISHED ||
    match.status === MatchStatus.CANCELLED;

  const kickoffLabel = useMemo(() => {
    const d = new Date(match.startTime);
    return d.toLocaleString('es-AR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [match.startTime]);

  const statusBadge = useMemo(() => {
    switch (match.status) {
      case MatchStatus.LIVE:
        return { text: 'En juego', tone: 'live' as const };
      case MatchStatus.FINISHED:
        return { text: 'Finalizado', tone: 'done' as const };
      case MatchStatus.CANCELLED:
        return { text: 'Cancelado', tone: 'cancelled' as const };
      default:
        return { text: 'Abierto', tone: 'open' as const };
    }
  }, [match.status]);

  const setResult = (result: Result) => {
    onChange({ ...pick, result });
  };

  const setScore = (side: 'home' | 'away', raw: string) => {
    const parsed = raw === '' ? undefined : Math.max(0, Number(raw));
    if (raw !== '' && Number.isNaN(parsed)) return;
    onChange({
      ...pick,
      homeScoreGuess: side === 'home' ? parsed : pick?.homeScoreGuess,
      awayScoreGuess: side === 'away' ? parsed : pick?.awayScoreGuess,
    });
  };

  return (
    <div
      className={`rounded-xl overflow-hidden border-l-4 transition-all ${
        pick?.isCaptain ? 'border-primary' : 'border-transparent'
      } ${isLocked ? 'opacity-60' : ''}`}
      style={{ background: 'var(--surface)' }}
    >
      <div className="p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
            {kickoffLabel}
          </span>
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${
              statusBadge.tone === 'live'
                ? 'bg-yellow-500/10 text-yellow-500 animate-pulse'
                : statusBadge.tone === 'done'
                  ? 'bg-gray-500/10 text-gray-400'
                  : statusBadge.tone === 'cancelled'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-primary-container/10 text-primary-container'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {statusBadge.text}
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-center">
            <p className="text-xs font-bold uppercase tracking-tight text-white">
              {match.homeTeam}
            </p>
            {match.status === MatchStatus.FINISHED &&
              match.homeScore !== null && (
                <p className="text-2xl font-black text-primary mt-1">
                  {match.homeScore}
                </p>
              )}
          </div>

          <div className="flex items-center gap-2">
            {(Object.keys(RESULT_LABELS) as Result[]).map((r) => {
              const active = pick?.result === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setResult(r)}
                  className={`w-12 h-12 rounded-lg font-black text-lg transition-all ${
                    active
                      ? 'bg-primary text-black shadow-[0_0_20px_rgba(181,242,61,0.3)]'
                      : 'bg-surface-container-highest text-white hover:bg-surface-bright'
                  } ${isLocked ? 'cursor-not-allowed' : 'active:scale-90'}`}
                >
                  {RESULT_LABELS[r]}
                </button>
              );
            })}
          </div>

          <div className="flex-1 text-center">
            <p className="text-xs font-bold uppercase tracking-tight text-white">
              {match.awayTeam}
            </p>
            {match.status === MatchStatus.FINISHED &&
              match.awayScore !== null && (
                <p className="text-2xl font-black text-primary mt-1">
                  {match.awayScore}
                </p>
              )}
          </div>
        </div>

        {!isLocked && (
          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Bonus marcador (+3 pts)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                className="w-10 h-8 bg-surface-container-lowest rounded text-center text-sm font-bold focus:ring-1 focus:ring-primary p-0"
                type="number"
                min={0}
                placeholder="0"
                value={pick?.homeScoreGuess ?? ''}
                onChange={(e) => setScore('home', e.target.value)}
              />
              <span className="text-on-surface-variant font-bold">-</span>
              <input
                className="w-10 h-8 bg-surface-container-lowest rounded text-center text-sm font-bold focus:ring-1 focus:ring-primary p-0"
                type="number"
                min={0}
                placeholder="0"
                value={pick?.awayScoreGuess ?? ''}
                onChange={(e) => setScore('away', e.target.value)}
              />
            </div>
          </div>
        )}

        {isCaptainOption && !isLocked && (
          <div className="mt-3 flex items-center justify-end">
            <label className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
              <input
                type="checkbox"
                checked={pick?.isCaptain ?? false}
                onChange={(e) =>
                  onChange({ ...pick, isCaptain: e.target.checked })
                }
              />
              Capitán (x2)
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
