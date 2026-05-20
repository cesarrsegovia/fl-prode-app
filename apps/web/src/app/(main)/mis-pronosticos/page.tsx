'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Crown, Loader2, XCircle } from 'lucide-react';
import { Result } from '@prode/shared';
import { stats, type PredictionHistoryItem } from '@/lib/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'hit' | 'miss';

const RESULT_LABEL: Record<Result, string> = {
  [Result.HOME]: 'Local',
  [Result.DRAW]: 'Empate',
  [Result.AWAY]: 'Visitante',
};

function actualResult(
  m: PredictionHistoryItem['match'],
): Result | null {
  if (m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore > m.awayScore) return Result.HOME;
  if (m.homeScore < m.awayScore) return Result.AWAY;
  return Result.DRAW;
}

function HistoryRow({ p }: { p: PredictionHistoryItem }) {
  const finished = p.match.status === 'FINISHED';
  const real = actualResult(p.match);
  const hit = finished && real && p.result === real;
  const exact =
    hit &&
    p.homeScoreGuess === p.match.homeScore &&
    p.awayScoreGuess === p.match.awayScore;

  return (
    <Link
      href={`/partido/${p.match.id}`}
      className="block"
    >
      <Card className="bg-surface-1 border-line hover:border-neon/40 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <TeamFlag size="sm" src={p.match.homeTeam?.flagUrl ?? null} alt={p.match.homeTeamName} />
              <span className="font-display font-semibold text-sm text-foreground truncate">
                {p.match.homeTeamName}
              </span>
              <span className="text-ink-dim text-xs">vs</span>
              <span className="font-display font-semibold text-sm text-foreground truncate">
                {p.match.awayTeamName}
              </span>
              <TeamFlag size="sm" src={p.match.awayTeam?.flagUrl ?? null} alt={p.match.awayTeamName} />
            </div>
            {finished && (
              <span className="font-display font-extrabold text-lg text-foreground tabular-nums shrink-0">
                {p.match.homeScore}–{p.match.awayScore}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim">
                {p.fixture.name ?? `Fecha ${p.fixture.round}`}
              </span>
              <span className="text-ink-dim">·</span>
              <span className="text-ink-muted">
                Pickeaste{' '}
                <span className="text-foreground font-display font-bold">
                  {RESULT_LABEL[p.result]}
                </span>
                {p.homeScoreGuess !== null && p.awayScoreGuess !== null && (
                  <span className="text-ink-dim ml-1">
                    ({p.homeScoreGuess}-{p.awayScoreGuess})
                  </span>
                )}
              </span>
              {p.isCaptain && (
                <Badge
                  variant="outline"
                  className="text-[10px] gap-1 border-neon/40 text-neon"
                >
                  <Crown className="size-3" />
                  Capitán
                </Badge>
              )}
            </div>

            {finished && (
              <div className="flex items-center gap-2 shrink-0">
                {hit ? (
                  <CheckCircle2 className="size-4 text-neon" />
                ) : (
                  <XCircle className="size-4 text-destructive/70" />
                )}
                <span
                  className={cn(
                    'font-display font-extrabold tabular-nums',
                    (p.pointsEarned ?? 0) > 0 ? 'text-neon' : 'text-ink-dim',
                  )}
                >
                  {p.pointsEarned ?? 0} pts
                </span>
                {exact && (
                  <Badge className="bg-neon/15 text-neon text-[10px]">
                    Exacto
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MisPronosticosPage() {
  const [items, setItems] = useState<PredictionHistoryItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    stats
      .history()
      .then((res) => {
        setItems(res.items);
        setCursor(res.nextCursor);
      })
      .finally(() => setLoading(false));
  }, []);

  const loadMore = async () => {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const res = await stats.history(cursor);
      setItems((prev) => [...prev, ...res.items]);
      setCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = items.filter((p) => {
    if (filter === 'all') return true;
    if (p.match.status !== 'FINISHED') return false;
    const real = actualResult(p.match);
    const hit = real && p.result === real;
    return filter === 'hit' ? hit : !hit;
  });

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-10">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-2">
          Mi historial
        </p>
        <h1 className="font-display font-extrabold text-foreground tracking-[-0.04em] text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]">
          Mis pronósticos.
        </h1>
      </header>

      <div className="flex gap-2 mb-6">
        {(['all', 'hit', 'miss'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 rounded-full text-xs font-display font-bold uppercase tracking-[0.15em] transition-colors',
              filter === f
                ? 'bg-neon text-primary-foreground'
                : 'bg-surface-1 text-ink-muted hover:text-foreground hover:bg-surface-2',
            )}
          >
            {f === 'all' ? 'Todos' : f === 'hit' ? 'Acierto' : 'Falla'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin pronósticos por mostrar</EmptyTitle>
            <EmptyDescription>
              {filter === 'all'
                ? 'Cargá tus primeros pronósticos para ver el historial.'
                : 'Cambiá el filtro o esperá a que se calculen más puntos.'}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((p) => (
              <HistoryRow key={p.id} p={p} />
            ))}
          </div>
          {cursor && filter === 'all' && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-surface-1 border border-line hover:border-neon font-display font-bold text-sm uppercase tracking-[0.15em] text-ink-muted hover:text-neon transition-colors"
              >
                {loadingMore && <Loader2 className="size-3 animate-spin" />}
                Cargar más
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
