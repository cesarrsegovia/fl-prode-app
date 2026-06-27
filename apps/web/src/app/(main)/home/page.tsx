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
  matchesApi,
  notificaciones,
  ranking,
  topScorers,
  type MyGroupEntry,
  type NotificationDto,
  type TodayMatchDto,
  type TopScorerDto,
} from '@/lib/endpoints';
import { MATCH_LEAD_MS } from '@prode/shared';
import { apiClient } from '@/lib/api';
import { useRoundName } from '@/lib/round-name';
import { displayName } from '@/lib/display-name';
import { getInitials } from '@/lib/avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotificationText } from '@/lib/notification-text';
import { Countdown } from '@/components/prode/Countdown';
import { GroupCard } from '@/components/grupos/GroupCard';
import { PositionBadge } from '@/components/ranking/PositionBadge';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { MatchRow } from '@/components/torneo/MatchRow';
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
  const notificationText = useNotificationText();
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const username =
    session?.user?.name ?? session?.user?.email ?? t('playerFallback');

  const [tournament, setTournament] = useState<TournamentSummary | null>(null);
  const [nextFixture, setNextFixture] = useState<FixtureWithMatches | null>(null);
  const [todayMatches, setTodayMatches] = useState<TodayMatchDto[]>([]);
  const [myGroups, setMyGroups] = useState<MyGroupEntry[]>([]);
  const [fullRanking, setFullRanking] = useState<RankingEntry[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<NotificationDto[]>([]);
  const [scorers, setScorers] = useState<TopScorerDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const nextOpenDeadline = useMemo(() => {
    if (!nextFixture) return null;
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
      matchesApi.today().catch(() => []),
      topScorers.list(5).catch(() => []),
    ])
      .then(([tour, fx, gs, rk, nt, today, sc]) => {
        setTournament(tour);
        setNextFixture(fx[0] ?? null);
        setMyGroups(gs);
        setFullRanking(rk);
        setRecentNotifs(nt.slice(0, 5));
        setTodayMatches(today);
        setScorers(sc);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const firstOpenTodayFixtureId = useMemo(
    () =>
      todayMatches.find(
        (m) =>
          m.status === 'PENDING' &&
          new Date(m.startTime).getTime() - MATCH_LEAD_MS > Date.now(),
      )?.fixtureId ?? null,
    [todayMatches],
  );

  const tourDays = daysUntil(tournament?.startDate ?? null);
  const topRanking = useMemo(() => fullRanking.slice(0, 5), [fullRanking]);
  const myEntry = useMemo(
    () => fullRanking.find((e) => e.userId === userId) ?? null,
    [fullRanking, userId],
  );

  return (
    <main className="pt-24 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      <header className="mb-10">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon">
          {t('greeting', { name: username })}
        </p>
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

      {/* Partidos de hoy */}
      <section className="mb-12">
        <h2 className="font-display font-extrabold text-2xl text-foreground tracking-tight mb-4">
          {t('today.title')}
        </h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : todayMatches.length === 0 ? (
          <Card className="bg-surface-1 border-line">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-ink-muted">{t('today.empty')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {todayMatches.map((m) => {
              const openForPicks =
                m.status === 'PENDING' &&
                new Date(m.startTime).getTime() - MATCH_LEAD_MS > Date.now();
              const goToPredictions = openForPicks ? (
                <Link
                  href={`/prode/${m.fixtureId}`}
                  className="bg-neon text-primary-foreground font-display font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-transform whitespace-nowrap"
                >
                  {t('today.goToPredictions')}
                </Link>
              ) : null;
              return (
                <MatchRow
                  key={m.id}
                  match={m}
                  href={false}
                  // Desktop: el CTA va dentro de cada card.
                  // Mobile: se reemplaza por un único botón al final (ver abajo).
                  action={
                    goToPredictions && (
                      <span className="hidden sm:inline-flex">
                        {goToPredictions}
                      </span>
                    )
                  }
                />
              );
            })}

            {/* Mobile: un solo CTA al final que lleva al primer partido abierto. */}
            {firstOpenTodayFixtureId && (
              <Link
                href={`/prode/${firstOpenTodayFixtureId}`}
                className="sm:hidden block w-full text-center bg-neon text-primary-foreground font-display font-bold text-sm px-4 py-3 rounded-xl active:scale-95 transition-transform mt-3"
              >
                {t('today.goToPredictions')}
              </Link>
            )}
          </div>
        )}
      </section>

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
                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    {isOpen && (
                      <span className="text-ink-muted">{t('nextFixture.nextClosesIn')}</span>
                    )}
                    <Countdown targetDate={targetDate!} />
                  </div>
                  <Link
                    href={`/prode/${nextFixture.id}`}
                    className="block w-full text-center sm:w-auto bg-neon text-primary-foreground font-display font-extrabold text-sm px-5 py-2.5 rounded-xl glow-neon active:scale-95 transition-transform"
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

      {/* Mis grupos + Goleadores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12 items-start">
        {/* Mis grupos */}
        <section>
          <h2 className="font-display font-extrabold text-2xl text-foreground tracking-tight mb-4">
            {t('myGroups.title')}
          </h2>
          <div className="flex justify-end mb-3">
            <Link
              href="/grupos"
              className="text-xs font-display font-bold text-neon hover:underline uppercase tracking-[0.18em]"
            >
              {t('myGroups.viewAll')}
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
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
            <div className="space-y-3">
              {myGroups.slice(0, 3).map((entry) => (
                <GroupCard key={entry.group.id} entry={entry} />
              ))}
            </div>
          )}
        </section>

        {/* Goleadores del torneo (ESPN) */}
        <Card className="bg-surface-1 border-line">
          <CardHeader>
            <h3 className="font-display font-extrabold text-lg text-foreground">
              {t('topScorers.title')}
            </h3>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : scorers.length === 0 ? (
              <p className="text-sm text-ink-muted">{t('topScorers.empty')}</p>
            ) : (
              <ul className="space-y-2">
                {scorers.map((s, i) => (
                  <li
                    key={`${s.name}-${i}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-2"
                  >
                    <span className="font-display font-extrabold text-sm text-ink-dim tabular-nums w-4 text-center shrink-0">
                      {i + 1}
                    </span>
                    <Avatar size="default" className="shrink-0">
                      <AvatarImage src={s.photoUrl ?? undefined} alt={s.name} />
                      <AvatarFallback className="bg-surface-3 text-foreground text-xs font-bold">
                        {getInitials(s.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-bold text-sm text-foreground truncate">
                        {s.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {s.flagUrl && (
                          <TeamFlag size="xs" src={s.flagUrl} alt={s.teamName ?? ''} />
                        )}
                        <span className="text-[11px] text-ink-muted truncate">
                          {s.teamName ?? s.teamShortName ?? ''}
                        </span>
                      </div>
                    </div>
                    <span className="font-display font-extrabold text-base text-neon tabular-nums shrink-0">
                      {t('topScorers.goals', { count: s.goals })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

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
                      {displayName(e.username, e.userId)}
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
                      <p className="text-sm text-foreground">{notificationText(n)}</p>
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
