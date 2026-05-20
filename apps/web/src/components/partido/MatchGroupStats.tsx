'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import {
  grupos,
  matchStats,
  type MatchGroupAggregate,
  type MyGroupEntry,
} from '@/lib/endpoints';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface Props {
  matchId: string;
}

interface GroupBlock {
  entry: MyGroupEntry;
  agg: MatchGroupAggregate;
}

export function MatchGroupStats({ matchId }: Props) {
  const [blocks, setBlocks] = useState<GroupBlock[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    grupos
      .mine()
      .then(async (mine) => {
        const results = await Promise.all(
          mine.map(async (entry) => {
            const agg = await matchStats
              .groupAggregate(matchId, entry.group.id)
              .catch(() => null);
            return agg ? { entry, agg } : null;
          }),
        );
        if (!cancelled) {
          setBlocks(results.filter((b): b is GroupBlock => b !== null));
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (loading) {
    return <Skeleton className="h-32 w-full" />;
  }

  if (!blocks || blocks.length === 0) return null;

  return (
    <section>
      <h3 className="font-display font-extrabold text-xl text-foreground mb-4 tracking-tight flex items-center gap-2">
        <Users className="size-5 text-neon" />
        ¿Qué piensa tu gente?
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {blocks.map(({ entry, agg }) => (
          <Card key={entry.group.id} className="bg-surface-1 border-line">
            <CardHeader className="pb-2">
              <Link
                href={`/grupos/${entry.group.id}`}
                className="font-display font-extrabold text-foreground hover:text-neon transition-colors"
              >
                {entry.group.name}
              </Link>
              <p className="text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim">
                {agg.total}/{agg.members} pronosticaron
                {agg.pending > 0 && (
                  <span className="text-citrus"> · {agg.pending} pendientes</span>
                )}
              </p>
            </CardHeader>
            <CardContent className="pb-4 space-y-2">
              {agg.total === 0 ? (
                <p className="text-xs text-ink-muted">
                  Sin pronósticos cargados todavía.
                </p>
              ) : (
                <>
                  <Bar label="1" value={agg.homePct} count={agg.home} tone="home" />
                  <Bar label="X" value={agg.drawPct} count={agg.draw} tone="draw" />
                  <Bar label="2" value={agg.awayPct} count={agg.away} tone="away" />
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Bar({
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
    <div className="flex items-center gap-3">
      <span className="font-display font-extrabold text-sm text-ink-muted w-4 text-center">
        {label}
      </span>
      <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
        <div
          className={cn('h-full transition-all', color)}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="font-display font-bold text-sm text-foreground tabular-nums w-12 text-right">
        {value}%
        <span className="text-ink-dim text-[10px] font-normal ml-1">
          ({count})
        </span>
      </span>
    </div>
  );
}
