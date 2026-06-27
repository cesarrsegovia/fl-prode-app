'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Crown, Target } from 'lucide-react';
import { Result } from '@prode/shared';
import { admin, type AdminUserProde } from '@/lib/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { PointsBreakdown } from '@/components/prode/PointsBreakdown';
import { useRoundName } from '@/lib/round-name';
import { displayName } from '@/lib/display-name';

export default function AdminUserProdePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const t = useTranslations('grupos.memberProde');
  const roundName = useRoundName();

  const [data, setData] = useState<AdminUserProde | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await admin.userProde(userId);
        setData(res);
      } catch (e) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? t('loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (error || !data) {
    return (
      <div>
        <p className="text-sm text-destructive font-bold">{error ?? t('loadError')}</p>
        <Link href="/admin/usuarios" className="text-xs text-neon mt-4 inline-flex items-center gap-1">
          <ArrowLeft className="size-3" /> {t('back')}
        </Link>
      </div>
    );
  }

  const finished = data.history.items.filter((p) => p.match.status === 'FINISHED');

  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="text-xs font-display font-bold uppercase tracking-[0.18em] text-ink-muted hover:text-neon mb-6 inline-flex items-center gap-1"
      >
        <ArrowLeft className="size-3" /> {t('back')}
      </Link>

      <header className="mb-8">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-2">
          {t('eyebrow')}
        </p>
        <h2 className="font-display font-extrabold text-foreground tracking-[-0.03em] text-[clamp(1.75rem,5vw,3rem)]">
          {displayName(data.user.username, data.user.id)}
        </h2>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <Card className="bg-surface-1 border-line">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="size-4 text-neon" />
              <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-ink-muted">
                {t('champion')}
              </p>
            </div>
            <p className="font-display font-extrabold text-lg text-foreground">
              {data.champion?.champTeam.name ?? t('none')}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-surface-1 border-line">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Target className="size-4 text-neon" />
              <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-ink-muted">
                {t('topScorer')}
              </p>
            </div>
            <p className="font-display font-extrabold text-lg text-foreground">
              {data.topScorer?.player.name ?? t('none')}
            </p>
          </CardContent>
        </Card>
      </div>

      {data.r32.length > 0 && (
        <section className="mb-8">
          <h3 className="font-display font-extrabold text-lg text-foreground mb-3">
            {t('qualifiers')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.r32.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-surface-1 rounded-lg px-3 py-2">
                <TeamFlag size="sm" src={p.team.flagUrl} alt={p.team.name} />
                <span className="text-xs font-display font-bold text-foreground">
                  {p.team.shortName ?? p.team.name}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="font-display font-extrabold text-lg text-foreground mb-3">
          {t('results')}
        </h3>
        {finished.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('noResults')}</p>
        ) : (
          <div className="space-y-3">
            {finished.map((p) => (
              <Card key={p.id} className="bg-surface-1 border-line">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <TeamFlag size="sm" src={p.match.homeTeam?.flagUrl ?? null} alt={p.match.homeTeamName} />
                      <span className="font-display font-semibold text-sm text-foreground truncate">
                        {p.match.homeTeamName} {p.match.homeScore}–{p.match.awayScore} {p.match.awayTeamName}
                      </span>
                      <TeamFlag size="sm" src={p.match.awayTeam?.flagUrl ?? null} alt={p.match.awayTeamName} />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim">
                      {roundName(p.fixture.round)} · {p.result}
                      {p.homeScoreGuess !== null && p.awayScoreGuess !== null && ` (${p.homeScoreGuess}-${p.awayScoreGuess})`}
                    </p>
                  </div>
                  <PointsBreakdown
                    pred={{
                      result: p.result as Result,
                      homeScoreGuess: p.homeScoreGuess,
                      awayScoreGuess: p.awayScoreGuess,
                      isCaptain: p.isCaptain,
                    }}
                    match={{
                      homeScore: p.match.homeScore,
                      awayScore: p.match.awayScore,
                      status: p.match.status,
                    }}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
