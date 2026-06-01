'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import {
  grupos,
  matchStats,
  type MatchGroupAggregate,
  type MyGroupEntry,
} from '@/lib/endpoints';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PercentBar } from '@/components/ui/percent-bar';

interface Props {
  matchId: string;
}

interface GroupBlock {
  entry: MyGroupEntry;
  agg: MatchGroupAggregate;
}

export function MatchGroupStats({ matchId }: Props) {
  const t = useTranslations('partido.groupStats');
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
        {t('title')}
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
                {t('submitted', { total: agg.total, members: agg.members })}
                {agg.pending > 0 && (
                  <>{' '}<span className="text-citrus">{t('pending', { count: agg.pending })}</span></>
                )}
              </p>
            </CardHeader>
            <CardContent className="pb-4 space-y-2">
              {agg.total === 0 ? (
                <p className="text-xs text-ink-muted">
                  {t('empty')}
                </p>
              ) : (
                <div className="space-y-2">
                  {(
                    [
                      { label: '1', value: agg.homePct, count: agg.home, tone: 'neon' },
                      { label: 'X', value: agg.drawPct, count: agg.draw, tone: 'citrus' },
                      { label: '2', value: agg.awayPct, count: agg.away, tone: 'grass' },
                    ] as const
                  ).map(({ label, value, count, tone }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="font-display font-extrabold text-sm text-ink-muted w-4 text-center">
                        {label}
                      </span>
                      <PercentBar
                        value={value}
                        tone={tone}
                        label={`${label}: ${value}%`}
                        className="flex-1"
                      />
                      <span className="font-display font-bold text-sm text-foreground tabular-nums w-12 text-right">
                        {value}%
                        <span className="text-ink-dim text-[10px] font-normal ml-1">({count})</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

