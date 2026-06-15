'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Crown, Target } from 'lucide-react';
import { Result } from '@prode/shared';
import {
  bracketPick,
  topScorerPick,
  r32Picks,
  stats,
  type BracketPickResponse,
  type TopScorerPickResponse,
  type R32PickResponse,
  type PredictionHistoryItem,
} from '@/lib/endpoints';
import { apiClient } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { PointsBreakdown } from '@/components/prode/PointsBreakdown';
import { useRoundName } from '@/lib/round-name';
import { displayName } from '@/lib/display-name';

interface TournamentSummary {
  id: string;
  name: string;
}
interface UserDto {
  id: string;
  username: string | null;
}

export default function MemberProdePage({
  params,
}: {
  params: Promise<{ id: string; userId: string }>;
}) {
  const { id: groupId, userId } = use(params);
  const t = useTranslations('grupos.memberProde');
  const roundName = useRoundName();

  const [user, setUser] = useState<UserDto | null>(null);
  const [champ, setChamp] = useState<BracketPickResponse | null>(null);
  const [scorer, setScorer] = useState<TopScorerPickResponse | null>(null);
  const [r32, setR32] = useState<R32PickResponse[]>([]);
  const [history, setHistory] = useState<PredictionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const u = await apiClient.get<UserDto>(`/users/${userId}`).then((r) => r.data);
        setUser(u);
        const tournament = await apiClient
          .get<TournamentSummary>('/tournaments/active')
          .then((r) => r.data)
          .catch(() => null);
        if (tournament) {
          const [c, s, q] = await Promise.all([
            bracketPick.ofUser(tournament.id, userId, groupId).catch(() => null),
            topScorerPick.ofUser(tournament.id, userId, groupId).catch(() => null),
            r32Picks.ofUser(tournament.id, userId, groupId).catch(() => []),
          ]);
          setChamp(c);
          setScorer(s);
          setR32(q);
        }
        const h = await stats.userHistory(userId, groupId).catch(() => ({ items: [], nextCursor: null }));
        setHistory(h.items);
      } catch (e) {
        const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
        setError(msg ?? t('loadError'));
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, groupId]);

  if (loading) {
    return (
      <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }
  if (error) {
    return (
      <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
        <p className="text-sm text-destructive font-bold">{error}</p>
        <Link href={`/grupos/${groupId}`} className="text-xs text-neon mt-4 inline-block">
          {t('back')}
        </Link>
      </main>
    );
  }

  const finished = history.filter((p) => p.match.status === 'FINISHED');

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-8">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-2">
          {t('eyebrow')}
        </p>
        <h1 className="font-display font-extrabold text-foreground tracking-[-0.03em] text-[clamp(2rem,6vw,3.5rem)]">
          {displayName(user?.username, userId)}
        </h1>
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
              {champ?.champTeam.name ?? t('none')}
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
              {scorer?.player.name ?? t('none')}
            </p>
          </CardContent>
        </Card>
      </div>

      {r32.length > 0 && (
        <section className="mb-8">
          <h2 className="font-display font-extrabold text-lg text-foreground mb-3">
            {t('qualifiers')}
          </h2>
          <div className="flex flex-wrap gap-2">
            {r32.map((p) => (
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
        <h2 className="font-display font-extrabold text-lg text-foreground mb-3">
          {t('results')}
        </h2>
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

      <Link href={`/grupos/${groupId}`} className="text-xs font-display font-bold uppercase tracking-[0.18em] text-ink-muted hover:text-neon mt-8 inline-block">
        {t('back')}
      </Link>
    </main>
  );
}
