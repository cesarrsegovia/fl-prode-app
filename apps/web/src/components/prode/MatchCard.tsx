'use client';

import { useMemo } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import type { Match } from '@prode/shared';
import { MatchStatus, Result } from '@prode/shared';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resultFromScore, scoreForResult } from '@/lib/match-pick';
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
  [Result.HOME]: 'L',
  [Result.DRAW]: 'E',
  [Result.AWAY]: 'V',
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
    const { home, away } = scoreForResult(
      result,
      pick?.homeScoreGuess,
      pick?.awayScoreGuess,
    );
    onChange({
      ...pick,
      result,
      homeScoreGuess: home,
      awayScoreGuess: away,
    });
  };

  const setScore = (side: 'home' | 'away', raw: string) => {
    const parsed = raw === '' ? undefined : Math.max(0, Number(raw));
    if (raw !== '' && Number.isNaN(parsed)) return;
    const homeScoreGuess = side === 'home' ? parsed : pick?.homeScoreGuess;
    const awayScoreGuess = side === 'away' ? parsed : pick?.awayScoreGuess;
    const derived = resultFromScore(homeScoreGuess, awayScoreGuess);
    onChange({
      ...pick,
      homeScoreGuess,
      awayScoreGuess,
      result: derived ?? pick?.result,
    });
  };

  const adjustScore = (side: 'home' | 'away', delta: number) => {
    const current =
      (side === 'home' ? pick?.homeScoreGuess : pick?.awayScoreGuess) ?? 0;
    setScore(side, String(Math.max(0, current + delta)));
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
            <div className="flex items-start gap-3">
              <ScoreStepper
                value={pick?.homeScoreGuess}
                inputAria={t('homeScoreLabel', { team: teamName(match, 'home') })}
                incAria={t('incrementScore', { team: teamName(match, 'home') })}
                decAria={t('decrementScore', { team: teamName(match, 'home') })}
                onType={(raw) => setScore('home', raw)}
                onStep={(delta) => adjustScore('home', delta)}
              />
              <span className="text-ink-muted font-bold text-lg leading-9">-</span>
              <ScoreStepper
                value={pick?.awayScoreGuess}
                inputAria={t('awayScoreLabel', { team: teamName(match, 'away') })}
                incAria={t('incrementScore', { team: teamName(match, 'away') })}
                decAria={t('decrementScore', { team: teamName(match, 'away') })}
                onType={(raw) => setScore('away', raw)}
                onStep={(delta) => adjustScore('away', delta)}
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

/**
 * Input de goles con botones [−]/[+] debajo. Se puede tipear o usar los botones.
 * Las flechitas nativas del input number se ocultan.
 */
function ScoreStepper({
  value,
  inputAria,
  incAria,
  decAria,
  onType,
  onStep,
}: {
  value?: number;
  inputAria: string;
  incAria: string;
  decAria: string;
  onType: (raw: string) => void;
  onStep: (delta: number) => void;
}) {
  const stepBtn =
    'size-7 rounded bg-surface-2 text-ink-muted flex items-center justify-center transition hover:bg-neon/10 hover:text-neon active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neon disabled:opacity-40 disabled:pointer-events-none';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <input
        className="w-12 h-9 bg-surface-2 rounded text-center text-base font-display font-bold focus:ring-1 focus:ring-neon p-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        type="number"
        inputMode="numeric"
        aria-label={inputAria}
        min={0}
        placeholder="0"
        value={value ?? ''}
        onChange={(e) => onType(e.target.value)}
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={decAria}
          disabled={(value ?? 0) <= 0}
          onClick={() => onStep(-1)}
          className={stepBtn}
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label={incAria}
          onClick={() => onStep(1)}
          className={stepBtn}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
