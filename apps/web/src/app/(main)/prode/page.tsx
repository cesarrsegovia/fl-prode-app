'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { ChevronRight, Trophy, Check } from 'lucide-react';
import type { FixtureWithMatches } from '@prode/shared';
import { MatchStatus } from '@prode/shared';
import {
  bracketPick,
  fixtures,
  pronosticos,
  topScorerPick,
  type BracketPickResponse,
  type TopScorerPickResponse,
} from '@/lib/endpoints';
import { apiClient } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Countdown } from '@/components/prode/Countdown';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { PredictionsProgressCard } from '@/components/prode/PredictionsProgressCard';
import {
  PredictionsFilterTabs,
  type PredictionsFilter,
} from '@/components/prode/PredictionsFilterTabs';
import { FeaturedPickCard } from '@/components/prode/FeaturedPickCard';
import { formatDeadline } from '@/lib/date';

interface TournamentSummary {
  id: string;
  name: string;
  startDate: string | null;
}

export default function ProdePage() {
  const t = useTranslations('prode');
  const tFeat = useTranslations('prode.featured');
  const locale = useLocale();
  const [tournament, setTournament] = useState<TournamentSummary | null>(null);
  const [items, setItems] = useState<FixtureWithMatches[]>([]);
  const [predictedMatchIds, setPredictedMatchIds] = useState<Set<string>>(
    new Set(),
  );
  const [champPick, setChampPick] = useState<BracketPickResponse | null>(null);
  const [topPick, setTopPick] = useState<TopScorerPickResponse | null>(null);
  const [filter, setFilter] = useState<PredictionsFilter>('pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient
        .get<TournamentSummary>('/tournaments/active')
        .then((r) => r.data)
        .catch(() => null),
      fixtures.active(),
      pronosticos.predictedMatchIds().catch(() => [] as string[]),
    ])
      .then(([tour, fx, ids]) => {
        setTournament(tour);
        setItems(fx);
        setPredictedMatchIds(new Set(ids));
      })
      .catch((e) => setError(e?.message ?? t('list.loadError')))
      .finally(() => setIsLoading(false));
  }, [t]);

  useEffect(() => {
    if (!tournament?.id) return;
    bracketPick.mine(tournament.id).then(setChampPick).catch(() => {});
    topScorerPick.mine(tournament.id).then(setTopPick).catch(() => {});
  }, [tournament?.id]);

  const allMatches = useMemo(() => items.flatMap((f) => f.matches), [items]);
  const predicted = useMemo(
    () => allMatches.filter((m) => predictedMatchIds.has(m.id)).length,
    [allMatches, predictedMatchIds],
  );
  const total = allMatches.length;
  const live = allMatches.filter((m) => m.status === MatchStatus.LIVE).length;
  const finished = allMatches.filter((m) => m.status === MatchStatus.FINISHED).length;
  const pending = Math.max(total - predicted - live - finished, 0);
  const counts = {
    pending,
    predicted,
    live,
    results: finished,
    topScorer: topPick ? 1 : 0,
  };

  const deadlineLabel = formatDeadline(tournament?.startDate ?? null, locale);

  // Filtra las fechas según el estado de sus partidos. Una fecha se incluye
  // si tiene al menos un partido que coincide con el filtro activo.
  const filteredItems = useMemo(() => {
    if (filter === 'topScorer') return [];
    return items.filter((fx) =>
      fx.matches.some((m) => {
        const isPredicted = predictedMatchIds.has(m.id);
        switch (filter) {
          case 'predicted':
            return isPredicted;
          case 'live':
            return m.status === MatchStatus.LIVE;
          case 'results':
            return m.status === MatchStatus.FINISHED;
          case 'pending':
          default:
            return (
              !isPredicted &&
              m.status !== MatchStatus.LIVE &&
              m.status !== MatchStatus.FINISHED
            );
        }
      }),
    );
  }, [items, filter, predictedMatchIds]);

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-8">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-2">
          {t('list.eyebrow')}
        </p>
        <h1 className="font-display font-extrabold text-foreground tracking-[-0.04em] text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]">
          {t('list.titleLine1')}
          <br />
          {t('list.titleLine2')}
        </h1>
        {tournament && (
          <Link
            href={`/torneo/${tournament.id}`}
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-surface-1 border border-line hover:border-neon transition-colors"
          >
            <Trophy className="size-3.5 text-neon" />
            <span className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
              {tournament.name}
            </span>
            <ChevronRight className="size-3 text-ink-dim" />
          </Link>
        )}
      </header>

      {!isLoading && !error && total > 0 && (
        <div className="space-y-3 mb-6">
          <PredictionsProgressCard predicted={predicted} total={total} />
          {tournament && (
            <div className="space-y-2">
              <FeaturedPickCard
                variant="champion"
                label={tFeat('champion.label')}
                pointsLabel={tFeat('champion.points')}
                pickName={champPick?.champTeam?.name ?? null}
                deadlineLabel={tFeat('deadlineUntil', { date: deadlineLabel })}
                emptyLabel={tFeat('empty')}
                href={`/torneo/${tournament.id}`}
              />
              <FeaturedPickCard
                variant="topScorer"
                label={tFeat('topScorer.label')}
                pointsLabel={tFeat('topScorer.points')}
                pickName={topPick?.player?.name ?? null}
                pickSubtitle={topPick?.player?.position ?? null}
                deadlineLabel={tFeat('deadlineUntil', { date: deadlineLabel })}
                emptyLabel={tFeat('empty')}
                href={`/torneo/${tournament.id}`}
              />
            </div>
          )}
          <PredictionsFilterTabs value={filter} onChange={setFilter} counts={counts} />
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      )}

      {error && <p className="text-sm text-destructive font-bold">{error}</p>}

      {!isLoading && !error && items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t('list.emptyTitle')}</EmptyTitle>
            <EmptyDescription>{t('list.emptyDesc')}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {!isLoading && !error && filter === 'topScorer' && (
        <Card className="bg-surface-1 border-line">
          <CardContent className="p-6 text-center text-sm text-ink-muted">
            {t('topScorerTabHint')}
            {tournament && (
              <div className="mt-3">
                <Link
                  href={`/torneo/${tournament.id}`}
                  className="font-display font-bold text-neon hover:underline"
                >
                  {t('goToTournament')}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filter === 'pending' && pending === 0 && total > 0 && (
        <Card className="bg-surface-1 border-line">
          <CardContent className="p-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-surface-2 text-neon">
              <Check size={20} />
            </div>
            <h3 className="font-display font-extrabold text-base">
              {t('allUpToDate.title')}
            </h3>
            <p className="text-sm text-ink-muted mt-1">
              {t('allUpToDate.subtitle')}
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && filter !== 'topScorer' &&
        filteredItems.length === 0 &&
        !(filter === 'pending' && pending === 0) &&
        items.length > 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t('list.noneInFilter')}</EmptyTitle>
            </EmptyHeader>
          </Empty>
        )}

      {filter !== 'topScorer' && filteredItems.length > 0 && (
        <ul className="space-y-4">
          {filteredItems.map((fx) => {
            const previews = fx.matches.slice(0, 4);
            return (
              <li key={fx.id}>
                <Link href={`/prode/${fx.id}`} className="block group">
                  <Card className="bg-surface-1 border-line hover:border-neon/60 transition-colors">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4 gap-4">
                        <div>
                          <h2 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
                            {fx.name ?? t('fixture.fallbackName', { round: fx.round })}
                          </h2>
                          <p className="text-xs uppercase tracking-[0.18em] font-display font-bold text-ink-dim mt-1">
                            {t('fixture.matches', { count: fx.matches.length })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-muted mb-1">
                            {t('fixture.closesIn')}
                          </p>
                          <Countdown targetDate={new Date(fx.closeAt)} />
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-wrap">
                        {previews.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2"
                          >
                            <TeamFlag size="xs" src={m.homeTeam?.flagUrl ?? null} alt={m.homeTeamName} />
                            <span className="text-[10px] font-display font-bold text-ink-muted">vs</span>
                            <TeamFlag size="xs" src={m.awayTeam?.flagUrl ?? null} alt={m.awayTeamName} />
                          </div>
                        ))}
                        {fx.matches.length > previews.length && (
                          <span className="text-xs font-display text-ink-dim">
                            +{fx.matches.length - previews.length}
                          </span>
                        )}
                      </div>

                      <div className="mt-5 flex items-center gap-1 text-xs font-display font-bold text-neon group-hover:underline">
                        {t('list.predict')}
                        <ChevronRight className="size-3" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
