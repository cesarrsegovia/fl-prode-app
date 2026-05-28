import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getFormatter, getTranslations } from 'next-intl/server';
import { ChevronRight, MapPin, Trophy } from 'lucide-react';
import { matchApi } from '@/lib/server-endpoints';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { MatchGroupStats } from '@/components/partido/MatchGroupStats';
import { VsFriends } from '@/components/partido/VsFriends';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('partido');
  try {
    const match = await matchApi.one(id);
    return {
      title: t('metaTitle', {
        home: match.homeTeamName,
        away: match.awayTeamName,
      }),
    };
  } catch {
    return { title: t('metaFallback') };
  }
}

function teamLabel(name: string, fullName?: string | null) {
  return fullName ?? name;
}

export default async function PartidoPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('partido');
  const format = await getFormatter();

  let match;
  let aggregate;
  try {
    [match, aggregate] = await Promise.all([
      matchApi.one(id),
      matchApi.aggregate(id).catch(() => ({
        total: 0,
        home: 0,
        draw: 0,
        away: 0,
        homePct: 0,
        drawPct: 0,
        awayPct: 0,
      })),
    ]);
  } catch {
    notFound();
  }

  const finished = match.status === 'FINISHED';
  const live = match.status === 'LIVE';
  const home = {
    name: teamLabel(match.homeTeamName, match.homeTeam?.name),
    flagUrl: match.homeTeam?.flagUrl ?? null,
    teamId: match.homeTeamId,
  };
  const away = {
    name: teamLabel(match.awayTeamName, match.awayTeam?.name),
    flagUrl: match.awayTeam?.flagUrl ?? null,
    teamId: match.awayTeamId,
  };

  return (
    <main className="pt-24 pb-24 px-4 max-w-4xl mx-auto">
      <Link
        href={`/torneo/${match.tournament.id}`}
        className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-ink-muted hover:text-neon uppercase tracking-[0.18em]"
      >
        ← {match.tournament.name}
      </Link>

      <header className="mt-3 mb-10">
        <div className="flex items-center gap-3 mb-4">
          {match.group && (
            <Badge variant="outline" className="font-display tracking-wider">
              {t('group', { name: match.group.name })}
            </Badge>
          )}
          <span className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-dim">
            {match.fixture.name ?? t('fixtureFallback', { round: match.fixture.round })}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 sm:gap-12">
          <article className="flex flex-col items-center gap-3 text-center">
            {home.teamId ? (
              <Link href={`/seleccion/${home.teamId}`}>
                <TeamFlag size="xl" src={home.flagUrl} alt={home.name} />
              </Link>
            ) : (
              <TeamFlag size="xl" src={home.flagUrl} alt={home.name} />
            )}
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-foreground">
              {home.name}
            </h2>
          </article>

          <div className="flex flex-col items-center gap-2 min-w-fit">
            {finished ? (
              <p className="font-display font-extrabold text-5xl sm:text-7xl text-neon tabular-nums">
                {match.homeScore} <span className="text-ink-dim">–</span>{' '}
                {match.awayScore}
              </p>
            ) : live ? (
              <>
                <Badge className="bg-neon text-primary-foreground animate-pulse">
                  {t('live')}
                </Badge>
                <p className="font-display font-extrabold text-4xl text-foreground tabular-nums">
                  {match.homeScore ?? 0} <span className="text-ink-dim">–</span>{' '}
                  {match.awayScore ?? 0}
                </p>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-muted">
                  {t('vs')}
                </span>
                <span className="font-display text-xs uppercase tracking-widest text-ink-dim">
                  {format.dateTime(new Date(match.startTime), {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </>
            )}
          </div>

          <article className="flex flex-col items-center gap-3 text-center">
            {away.teamId ? (
              <Link href={`/seleccion/${away.teamId}`}>
                <TeamFlag size="xl" src={away.flagUrl} alt={away.name} />
              </Link>
            ) : (
              <TeamFlag size="xl" src={away.flagUrl} alt={away.name} />
            )}
            <h2 className="font-display font-extrabold text-xl sm:text-2xl text-foreground">
              {away.name}
            </h2>
          </article>
        </div>

        <Separator className="my-8 bg-line/40" />

        <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-muted mb-1">
              {t('info.kickoff')}
            </dt>
            <dd className="font-display font-semibold text-foreground">
              {format.dateTime(new Date(match.startTime), {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </dd>
          </div>
          {match.venue && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-muted mb-1">
                <MapPin className="inline size-3 mr-1" />
                {t('info.venue')}
              </dt>
              <dd className="font-display font-semibold text-foreground">
                {match.venue.name}
                <span className="block text-ink-muted text-xs font-normal">
                  {match.venue.city}
                  {match.venue.country && `, ${match.venue.country}`}
                </span>
              </dd>
            </div>
          )}
          {match.refereeName && (
            <div>
              <dt className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-muted mb-1">
                {t('info.referee')}
              </dt>
              <dd className="font-display font-semibold text-foreground">
                {match.refereeName}
              </dd>
            </div>
          )}
        </dl>
      </header>

      <section>
        <h3 className="font-display font-extrabold text-xl text-foreground mb-4 tracking-tight">
          {t('poll.title')}
        </h3>
        {aggregate.total === 0 ? (
          <Card className="bg-surface-1 border-line">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-ink-muted">
                {t('poll.empty')}{' '}
                <Link
                  href={`/prode/${match.fixture.id}`}
                  className="text-neon hover:underline font-display font-bold inline-flex items-center gap-1"
                >
                  {t('poll.loadPrediction')}
                  <ChevronRight className="size-3" />
                </Link>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-surface-1 border-line">
            <CardContent className="p-6 space-y-4">
              <PercentBar
                label={t('poll.home')}
                value={aggregate.homePct}
                count={aggregate.home}
                tone="home"
              />
              <PercentBar
                label={t('poll.draw')}
                value={aggregate.drawPct}
                count={aggregate.draw}
                tone="draw"
              />
              <PercentBar
                label={t('poll.away')}
                value={aggregate.awayPct}
                count={aggregate.away}
                tone="away"
              />
              <p className="text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim pt-2 border-t border-line/40">
                {t('poll.totalPredictions', { count: aggregate.total })}
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="mt-10">
        <MatchGroupStats matchId={match.id} />
      </div>

      <div className="mt-10">
        <VsFriends
          matchId={match.id}
          homeTeamShort={match.homeTeam?.shortName ?? match.homeTeamName}
          awayTeamShort={match.awayTeam?.shortName ?? match.awayTeamName}
        />
      </div>

      {!finished && match.status !== 'CANCELLED' && (
        <div className="mt-10 flex justify-center">
          <Link
            href={`/prode/${match.fixture.id}`}
            className="inline-flex items-center gap-2 bg-neon text-primary-foreground font-display font-extrabold text-sm px-6 py-3 rounded-xl glow-neon active:scale-95 transition-transform"
          >
            <Trophy className="size-4" />
            {t('cta')}
          </Link>
        </div>
      )}
    </main>
  );
}

function PercentBar({
  label,
  value,
  count,
  tone,
}: {
  label: string;
  value: number;
  count: number;
  tone: 'home' | 'draw' | 'away';
}) {
  const color =
    tone === 'home'
      ? 'bg-neon'
      : tone === 'draw'
        ? 'bg-citrus'
        : 'bg-grass';
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="font-display font-semibold text-sm text-foreground">
          {label}
        </span>
        <span className="font-display font-extrabold text-lg text-foreground tabular-nums">
          {value}%
          <span className="text-xs text-ink-dim font-normal ml-2">
            ({count})
          </span>
        </span>
      </div>
      <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
