'use client';

import { use, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Match } from '@prode/shared';
import { MatchStatus, Result } from '@prode/shared';
import { useFixtureWithPredictions } from '@/hooks/useFixtureWithPredictions';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

function resultFrom(match: Match): Result | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return Result.HOME;
  if (match.homeScore < match.awayScore) return Result.AWAY;
  return Result.DRAW;
}

const OUTCOME_KEY: Record<Result, string> = {
  [Result.HOME]: 'home',
  [Result.DRAW]: 'draw',
  [Result.AWAY]: 'away',
};

function teamSide(match: Match, side: 'home' | 'away') {
  const team = side === 'home' ? match.homeTeam : match.awayTeam;
  const name =
    team?.shortName ?? team?.name ?? (side === 'home' ? match.homeTeamName : match.awayTeamName);
  return { name, flagUrl: team?.flagUrl ?? null };
}

export default function ResultadosPage({
  params,
}: {
  params: Promise<{ fechaId: string }>;
}) {
  const t = useTranslations('prode');
  const { fechaId } = use(params);
  const { fixture, predictions: preds, isLoading, error } =
    useFixtureWithPredictions(fechaId);

  const totalPoints = useMemo(
    () => preds.reduce((acc, p) => acc + (p.pointsEarned ?? 0), 0),
    [preds],
  );

  if (error) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <p role="alert" className="text-sm text-destructive font-bold">
          {error instanceof Error ? error.message : t('fixture.loadError')}
        </p>
      </main>
    );
  }

  if (isLoading || !fixture) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  const predByMatch = new Map(preds.map((p) => [p.matchId, p]));

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <Link
        href={`/prode/${fixture.id}`}
        className="text-[10px] font-display font-bold text-ink-muted hover:text-neon uppercase tracking-[0.18em]"
      >
        {t('results.back')}
      </Link>

      <header className="mt-3 mb-8 flex items-end justify-between">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.2em] text-neon mb-2">
            {t('results.title')}
          </p>
          <h1 className="font-display font-extrabold text-4xl text-foreground tracking-tight">
            {fixture.name ?? t('fixture.fallbackName', { round: fixture.round })}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-display font-bold uppercase tracking-[0.18em] text-ink-muted">
            {t('results.yourPoints')}
          </p>
          <p className="text-4xl font-display font-extrabold text-neon tabular-nums">
            {totalPoints}
          </p>
        </div>
      </header>

      {fixture.matches.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t('list.emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('list.emptyDesc')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-3">
          {fixture.matches.map((match) => {
          const realResult = resultFrom(match);
          const pred = predByMatch.get(match.id);
          const finished = match.status === MatchStatus.FINISHED;
          const hit = pred && realResult && pred.result === realResult;
          const exact =
            hit &&
            pred.homeScoreGuess === match.homeScore &&
            pred.awayScoreGuess === match.awayScore;
          const home = teamSide(match, 'home');
          const away = teamSide(match, 'away');

          return (
            <Card key={match.id} className="bg-surface-1 border-line/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <TeamFlag size="sm" src={home.flagUrl} alt={home.name} />
                    <span className="font-display font-bold text-sm text-foreground truncate">
                      {home.name}
                    </span>
                    <span className="font-display font-bold text-sm text-ink-dim">
                      vs
                    </span>
                    <span className="font-display font-bold text-sm text-foreground truncate">
                      {away.name}
                    </span>
                    <TeamFlag size="sm" src={away.flagUrl} alt={away.name} />
                  </div>
                  <span className="shrink-0 text-xs uppercase tracking-[0.18em] font-display font-bold text-ink-muted tabular-nums">
                    {finished
                      ? `${match.homeScore} - ${match.awayScore}`
                      : t('results.pending')}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-ink-dim uppercase tracking-[0.15em] font-display font-bold mb-1">
                      {t('results.real')}
                    </p>
                    <p className="text-foreground font-bold">
                      {realResult ? t(`results.outcome.${OUTCOME_KEY[realResult]}`) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-dim uppercase tracking-[0.15em] font-display font-bold mb-1">
                      {t('results.yourPick')}
                    </p>
                    <p className="text-foreground font-bold">
                      {pred ? t(`results.outcome.${OUTCOME_KEY[pred.result]}`) : t('results.noPick')}
                      {pred?.isCaptain && (
                        <span className="ml-2 text-neon">(C)</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-ink-dim uppercase tracking-[0.15em] font-display font-bold mb-1">
                      {t('results.points')}
                    </p>
                    <p
                      className={cn(
                        'font-display font-extrabold text-xl tabular-nums',
                        (pred?.pointsEarned ?? 0) > 0
                          ? 'text-neon'
                          : 'text-foreground',
                      )}
                    >
                      {pred?.pointsEarned ?? '—'}
                    </p>
                  </div>
                </div>

                {finished && pred && (
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {hit && (
                      <Badge className="bg-neon/10 text-neon hover:bg-neon/15">
                        {t('results.badgeResult')}
                      </Badge>
                    )}
                    {exact && (
                      <Badge className="bg-neon/10 text-neon hover:bg-neon/15">
                        {t('results.badgeExact')}
                      </Badge>
                    )}
                    {pred.isCaptain && (pred.pointsEarned ?? 0) > 0 && (
                      <Badge className="bg-citrus/10 text-citrus hover:bg-citrus/15">
                        {t('results.badgeCaptain')}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
          })}
        </ul>
      )}
    </main>
  );
}
