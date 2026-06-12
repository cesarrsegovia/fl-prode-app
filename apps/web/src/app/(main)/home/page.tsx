'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/session';
import { useFormatter, useTranslations } from 'next-intl';
import { ChevronRight, Trophy } from 'lucide-react';
import type { FixtureWithMatches, RankingEntry } from '@prode/shared';
import {
  fixtures,
  grupos,
  notificaciones,
  ranking,
  type MyGroupEntry,
  type NotificationDto,
} from '@/lib/endpoints';
import { apiClient } from '@/lib/api';
import { useRoundName } from '@/lib/round-name';
import { Countdown } from '@/components/prode/Countdown';
import { GroupCard } from '@/components/grupos/GroupCard';
import { PositionBadge } from '@/components/ranking/PositionBadge';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface TournamentSummary {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  country: string | null;
  _count?: { teams?: number; matches?: number };
}

function daysUntil(date: string | null) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function HomePage() {
  const t = useTranslations('home');
  const format = useFormatter();
  const roundName = useRoundName();
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const username =
    session?.user?.name ?? session?.user?.email ?? t('playerFallback');

  const [tournament, setTournament] = useState<TournamentSummary | null>(null);
  const [nextFixture, setNextFixture] = useState<FixtureWithMatches | null>(null);
  const [myGroups, setMyGroups] = useState<MyGroupEntry[]>([]);
  const [topRanking, setTopRanking] = useState<RankingEntry[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<NotificationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const nextOpenDeadline = useMemo(() => {
    if (!nextFixture) return null;
    const MATCH_LEAD_MS = 60 * 60 * 1000;
    const futures = nextFixture.matches
      .map((m) => new Date(m.startTime).getTime() - MATCH_LEAD_MS)
      .filter((time) => time > Date.now())
      .sort((a, b) => a - b);
    return futures[0] ? new Date(futures[0]) : null;
  }, [nextFixture]);

  const targetDate = useMemo(() => {
    if (!nextFixture) return null;
    return nextOpenDeadline ?? new Date(nextFixture.closeAt);
  }, [nextFixture, nextOpenDeadline]);

  const isOpen = !!nextOpenDeadline;

  useEffect(() => {
    Promise.all([
      apiClient.get<TournamentSummary>('/tournaments/active').then((r) => r.data).catch(() => null),
      fixtures.active().catch(() => []),
      grupos.mine().catch(() => []),
      ranking.global().catch(() => []),
      notificaciones.list().catch(() => []),
    ])
      .then(([tour, fx, gs, rk, nt]) => {
        setTournament(tour);
        setNextFixture(fx[0] ?? null);
        setMyGroups(gs);
        setTopRanking(rk.slice(0, 5));
        setRecentNotifs(nt.slice(0, 5));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const tourDays = daysUntil(tournament?.startDate ?? null);
  const myEntry = topRanking.find((e) => e.userId === userId);

  return (
    <main className="pt-24 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-2">
          {t('greeting', { name: username })}
        </p>
        <h1 className="font-display font-extrabold text-foreground tracking-[-0.04em] text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]">
          {t('heroLine1')}<br />{t('heroLine2')}
        </h1>
      </header>

      {/* Hero del Mundial */}
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-2xl mb-10" />
      ) : tournament ? (
        <Link
          href={`/torneo/${tournament.id}`}
          className="group block mb-12 relative overflow-hidden rounded-2xl border border-neon/30 bg-gradient-to-br from-surface-1 via-surface-1 to-surface-2 p-8 transition-all hover:border-neon hover:shadow-[0_0_48px_oklch(86%_0.25_152/0.25)]"
        >
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent 0, transparent 40px, oklch(45% 0.13 150 / 0.4) 40px, oklch(45% 0.13 150 / 0.4) 41px)',
            }}
          />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="size-4 text-neon" />
                <span className="font-display text-xs uppercase tracking-[0.25em] text-neon">
                  {t('tournament.active')}
                </span>
              </div>
              <h2 className="font-display font-extrabold text-foreground text-[clamp(2rem,5vw,3.5rem)] tracking-[-0.03em] leading-[0.95]">
                {tournament.name}
              </h2>
              {tournament.country && (
                <p className="font-display text-sm text-ink-muted mt-2">
                  {tournament.country}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-3 md:items-end">
              {tourDays !== null && tourDays > 0 && (
                <div className="flex items-baseline gap-3 px-4 py-2 rounded-xl bg-background/60 border border-line">
                  <span className="font-display font-extrabold text-3xl text-neon tabular-nums">
                    {tourDays}
                  </span>
                  <span className="font-display text-[10px] uppercase tracking-[0.2em] text-ink-muted">
                    {t('tournament.daysLabel', { count: tourDays })}<br />
                    {t('tournament.untilStart')}
                  </span>
                </div>
              )}
              <span className="inline-flex items-center gap-1 text-xs font-display font-bold text-foreground group-hover:text-neon transition-colors">
                {t('tournament.view')}
                <ChevronRight className="size-3" />
              </span>
            </div>
          </div>
        </Link>
      ) : null}

      {/* Próxima fecha + mi ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <Card className="lg:col-span-2 bg-surface-1 border-line">
          <CardHeader>
            <p className="font-display text-xs uppercase tracking-[0.25em] text-neon">
              {t('nextFixture.title')}
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : nextFixture ? (
              <>
                <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                  <h3 className="font-display font-extrabold text-3xl text-foreground tracking-tight">
                    {roundName(nextFixture.round)}
                  </h3>
                  <Badge
                    variant="outline"
                    className={
                      isOpen
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] font-black uppercase tracking-widest px-2 py-0.5'
                        : 'bg-destructive/10 text-destructive border-destructive/30 text-[10px] font-black uppercase tracking-widest px-2 py-0.5'
                    }
                  >
                    {t(isOpen ? 'nextFixture.open' : 'nextFixture.closed')}
                  </Badge>
                </div>
                <p className="text-sm text-ink-muted mb-4">
                  {t('nextFixture.matches', { count: nextFixture.matches.length })}
                </p>
                <div className="flex items-center gap-3 mb-6 flex-wrap">
                  {nextFixture.matches.slice(0, 6).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface-2"
                    >
                      <TeamFlag size="xs" src={m.homeTeam?.flagUrl ?? null} alt={m.homeTeamName} />
                      <span className="text-[10px] font-display font-bold text-ink-muted">vs</span>
                      <TeamFlag size="xs" src={m.awayTeam?.flagUrl ?? null} alt={m.awayTeamName} />
                    </div>
                  ))}
                  {nextFixture.matches.length > 6 && (
                    <span className="text-xs font-display text-ink-dim">
                      +{nextFixture.matches.length - 6}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {isOpen && (
                      <span className="text-ink-muted">{t('nextFixture.nextClosesIn')}</span>
                    )}
                    <Countdown targetDate={targetDate!} />
                  </div>
                  <Link
                    href={`/prode/${nextFixture.id}`}
                    className="bg-neon text-primary-foreground font-display font-extrabold text-sm px-5 py-2.5 rounded-xl glow-neon active:scale-95 transition-transform"
                  >
                    {t('nextFixture.loadPredictions')}
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                {t('nextFixture.none')}
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-1 border-line">
          <CardHeader>
            <p className="font-display text-xs uppercase tracking-[0.25em] text-neon">
              {t('myRanking.title')}
            </p>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : myEntry ? (
              <>
                <p className="font-display font-extrabold text-6xl text-foreground tabular-nums leading-none">
                  #{myEntry.position}
                </p>
                <p className="text-sm text-ink-muted mt-3">
                  {t.rich('myRanking.totalPoints', {
                    points: myEntry.total,
                    b: (chunks) => (
                      <span className="font-bold text-foreground tabular-nums">
                        {chunks}
                      </span>
                    ),
                  })}
                </p>
                <Link
                  href="/ranking"
                  className="inline-flex items-center gap-1 mt-4 text-sm font-display font-bold text-neon hover:underline"
                >
                  {t('myRanking.viewFull')}
                  <ChevronRight className="size-3" />
                </Link>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                {t('myRanking.empty')}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mis grupos */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
            {t('myGroups.title')}
          </h2>
          <Link
            href="/grupos"
            className="text-xs font-display font-bold text-neon hover:underline uppercase tracking-[0.18em]"
          >
            {t('myGroups.viewAll')}
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <Card className="bg-surface-1 border-line">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-ink-muted mb-3">
                {t('myGroups.empty')}
              </p>
              <Link
                href="/grupos"
                className="text-sm font-display font-bold text-neon hover:underline"
              >
                {t('myGroups.createOrJoin')}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myGroups.slice(0, 3).map((entry) => (
              <GroupCard key={entry.group.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      {/* Top + Actividad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-surface-1 border-line">
          <CardHeader>
            <h3 className="font-display font-extrabold text-lg text-foreground">
              {t('top5.title')}
            </h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : topRanking.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('top5.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {topRanking.map((e) => (
                  <li
                    key={e.userId}
                    className="flex items-center gap-3 p-3 rounded-lg bg-surface-2"
                  >
                    <PositionBadge position={e.position} />
                    <span className="flex-1 font-display font-bold text-foreground truncate">
                      {e.username}
                    </span>
                    <span className="text-sm font-display font-extrabold text-neon tabular-nums">
                      {t('top5.points', { points: e.total })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface-1 border-line">
          <CardHeader>
            <h3 className="font-display font-extrabold text-lg text-foreground">
              {t('activity.title')}
            </h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : recentNotifs.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('activity.empty')}</p>
            ) : (
              <ul className="space-y-3">
                {recentNotifs.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-surface-2"
                  >
                    <Badge variant="default" className="size-2 p-0 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{n.message}</p>
                      <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-dim mt-1">
                        {format.dateTime(new Date(n.createdAt), {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
