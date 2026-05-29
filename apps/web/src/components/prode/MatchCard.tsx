'use client';

import { useMemo } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import type { Match } from '@prode/shared';
import { MatchStatus, Result } from '@prode/shared';
import { cn } from '@/lib/utils';
import { TeamFlag } from '@/components/torneo/TeamFlag';

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

const RESULT_ARIA_KEY: Record<Result, string> = {
  [Result.HOME]: 'home',
  [Result.DRAW]: 'draw',
  [Result.AWAY]: 'away',
};

function teamFlag(match: Match, side: 'home' | 'away') {
  return side === 'home'
    ? (match.homeTeam?.flagUrl ?? null)
    : (match.awayTeam?.flagUrl ?? null);
}

function teamName(match: Match, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTeam?.shortName ?? match.homeTeam?.name ?? match.homeTeamName;
  }
  return match.awayTeam?.shortName ?? match.awayTeam?.name ?? match.awayTeamName;
}

export function MatchCard({
  match,
  pick,
  isCaptainOption,
  disabled,
  onChange,
}: Props) {
  const t = useTranslations('prode.match');
  const format = useFormatter();

  const isLocked =
    disabled ||
    match.status === MatchStatus.LIVE ||
    match.status === MatchStatus.FINISHED ||
    match.status === MatchStatus.CANCELLED;

  const kickoffLabel = format.dateTime(new Date(match.startTime), {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const statusBadge = useMemo(() => {
    switch (match.status) {
      case MatchStatus.LIVE:
        return { key: 'live', tone: 'live' as const };
      case MatchStatus.FINISHED:
        return { key: 'finished', tone: 'done' as const };
      case MatchStatus.CANCELLED:
        return { key: 'cancelled', tone: 'cancelled' as const };
      default:
        return { key: 'open', tone: 'open' as const };
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
      className={cn(
        'rounded-xl overflow-hidden border-l-4 transition-all bg-surface-1',
        pick?.isCaptain ? 'border-neon glow-neon' : 'border-line/40',
        isLocked && 'opacity-60',
      )}
    >
      <div className="p-4 sm:p-5">
        <div className="flex justify-between items-center mb-4">
          <span className="text-[10px] font-display font-bold uppercase tracking-[0.18em] text-ink-muted">
            {kickoffLabel}
          </span>
          <span
            className={cn(
              'px-3 py-1 rounded-full text-[10px] font-display font-extrabold uppercase tracking-[0.18em] flex items-center gap-1.5',
              statusBadge.tone === 'live' &&
                'bg-citrus/10 text-citrus animate-pulse',
              statusBadge.tone === 'done' && 'bg-line/40 text-ink-dim',
              statusBadge.tone === 'cancelled' &&
                'bg-destructive/10 text-destructive',
              statusBadge.tone === 'open' && 'bg-neon/10 text-neon',
            )}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {t(`status.${statusBadge.key}`)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex-1 min-w-0 flex flex-col items-center gap-2">
            <TeamFlag
              size="lg"
              src={teamFlag(match, 'home')}
              alt={teamName(match, 'home')}
            />
            <p className="text-xs font-display font-bold uppercase tracking-tight text-foreground text-center max-w-full truncate">
              {teamName(match, 'home')}
            </p>
            {match.status === MatchStatus.FINISHED &&
              match.homeScore !== null && (
                <p className="text-2xl font-display font-extrabold text-neon mt-1 tabular-nums">
                  {match.homeScore}
                </p>
              )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {(Object.keys(RESULT_LABELS) as Result[]).map((r) => {
              const active = pick?.result === r;
              return (
                <button
                  key={r}
                  type="button"
                  disabled={isLocked}
                  aria-pressed={active}
                  aria-label={t(`pickAria.${RESULT_ARIA_KEY[r]}`)}
                  onClick={() => setResult(r)}
                  className={cn(
                    'size-10 sm:size-12 rounded-lg font-display font-extrabold text-lg transition-all',
                    active
                      ? 'bg-neon text-primary-foreground glow-neon'
                      : 'bg-surface-2 text-foreground hover:bg-surface-3',
                    isLocked ? 'cursor-not-allowed' : 'active:scale-90',
                  )}
                >
                  {RESULT_LABELS[r]}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 flex flex-col items-center gap-2">
            <TeamFlag
              size="lg"
              src={teamFlag(match, 'away')}
              alt={teamName(match, 'away')}
            />
            <p className="text-xs font-display font-bold uppercase tracking-tight text-foreground text-center max-w-full truncate">
              {teamName(match, 'away')}
            </p>
            {match.status === MatchStatus.FINISHED &&
              match.awayScore !== null && (
                <p className="text-2xl font-display font-extrabold text-neon mt-1 tabular-nums">
                  {match.awayScore}
                </p>
              )}
          </div>
        </div>

        {!isLocked && (
          <div className="mt-6 pt-4 border-t border-line/40 flex items-center justify-between">
            <span className="text-[10px] font-display font-extrabold uppercase tracking-[0.18em] text-ink-muted">
              {t('scoreBonus')}
            </span>
            <div className="flex items-center gap-3">
              <input
                className="w-10 h-8 bg-surface-2 rounded text-center text-sm font-display font-bold focus:ring-1 focus:ring-neon p-0 tabular-nums"
                type="number"
                inputMode="numeric"
                aria-label={t('homeScoreLabel', { team: teamName(match, 'home') })}
                min={0}
                placeholder="0"
                value={pick?.homeScoreGuess ?? ''}
                onChange={(e) => setScore('home', e.target.value)}
              />
              <span className="text-ink-muted font-bold">-</span>
              <input
                className="w-10 h-8 bg-surface-2 rounded text-center text-sm font-display font-bold focus:ring-1 focus:ring-neon p-0 tabular-nums"
                type="number"
                inputMode="numeric"
                aria-label={t('awayScoreLabel', { team: teamName(match, 'away') })}
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
            <label className="flex items-center gap-2 text-xs font-display font-bold text-ink-muted">
              <input
                type="checkbox"
                className="accent-neon focus-visible:ring-2 focus-visible:ring-neon focus-visible:outline-none"
                checked={pick?.isCaptain ?? false}
                onChange={(e) =>
                  onChange({ ...pick, isCaptain: e.target.checked })
                }
              />
              {t('captainCheck')}
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
