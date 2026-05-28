'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Lock, Star, Users } from 'lucide-react';
import {
  grupos,
  matchStats,
  type GroupMemberPick,
  type MatchGroupPicks,
  type MyGroupEntry,
} from '@/lib/endpoints';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Props {
  matchId: string;
  homeTeamShort: string;
  awayTeamShort: string;
}

interface GroupBlock {
  entry: MyGroupEntry;
  picks: MatchGroupPicks;
}

function pickLabel(
  p: GroupMemberPick['prediction'],
  home: string,
  away: string,
  drawLabel: string,
) {
  if (!p) return null;
  if (p.result === 'HOME') return home;
  if (p.result === 'AWAY') return away;
  return drawLabel;
}

function pickTone(p: GroupMemberPick['prediction']) {
  if (!p) return 'text-ink-dim';
  if (p.result === 'HOME') return 'text-neon';
  if (p.result === 'DRAW') return 'text-citrus';
  return 'text-grass';
}

export function VsFriends({ matchId, homeTeamShort, awayTeamShort }: Props) {
  const t = useTranslations('partido');
  const { status } = useSession();
  const [blocks, setBlocks] = useState<GroupBlock[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'authenticated') {
      setLoading(false);
      return;
    }
    let cancelled = false;
    grupos
      .mine()
      .then(async (mine) => {
        const results = await Promise.all(
          mine.map(async (entry) => {
            const picks = await matchStats
              .groupPicks(matchId, entry.group.id)
              .catch(() => null);
            return picks ? { entry, picks } : null;
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
  }, [matchId, status]);

  if (status !== 'authenticated') return null;
  if (loading) return <Skeleton className="h-40 w-full" />;
  if (!blocks || !blocks.length) return null;

  return (
    <section>
      <h3 className="font-display font-extrabold text-xl text-foreground mb-4 tracking-tight flex items-center gap-2">
        <Users className="size-5 text-neon" />
        {t('friends.title')}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {blocks.map(({ entry, picks }) => (
          <Card key={entry.group.id} className="bg-surface-1 border-line">
            <CardHeader className="pb-2">
              <Link
                href={`/grupos/${entry.group.id}`}
                className="font-display font-extrabold text-foreground hover:text-neon transition-colors"
              >
                {entry.group.name}
              </Link>
              {!picks.closed && (
                <p className="text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim flex items-center gap-1">
                  <Lock className="size-3" />
                  {t('friends.hidden')}
                </p>
              )}
            </CardHeader>
            <CardContent className="pb-4">
              {picks.members.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  {t('friends.noMembers')}
                </p>
              ) : (
                <ul className="divide-y divide-line/40">
                  {picks.members.map((m) => (
                    <li
                      key={m.user.id}
                      className="flex items-center gap-3 py-2"
                    >
                      {m.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.user.avatarUrl}
                          alt={m.user.username}
                          className="h-7 w-7 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-surface-2 flex items-center justify-center text-[10px] font-display font-extrabold shrink-0">
                          {m.user.username.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="font-display font-bold text-sm text-foreground truncate flex-1 min-w-0">
                        {m.user.username}
                        {m.prediction?.isCaptain && (
                          <Star className="inline size-3 ml-1 text-citrus fill-citrus" />
                        )}
                      </span>

                      {m.prediction ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={cn(
                              'font-display font-extrabold text-xs uppercase tracking-wider',
                              pickTone(m.prediction),
                            )}
                          >
                            {pickLabel(m.prediction, homeTeamShort, awayTeamShort, t('poll.draw'))}
                          </span>
                          {m.prediction.homeScoreGuess !== null &&
                            m.prediction.awayScoreGuess !== null && (
                              <span className="font-display font-bold text-xs text-ink-muted tabular-nums">
                                {m.prediction.homeScoreGuess}-{m.prediction.awayScoreGuess}
                              </span>
                            )}
                          {m.prediction.pointsEarned !== null && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'tabular-nums',
                                m.prediction.pointsEarned > 0
                                  ? 'text-neon border-neon/40'
                                  : 'text-ink-dim',
                              )}
                            >
                              {m.prediction.pointsEarned > 0 ? '+' : ''}
                              {m.prediction.pointsEarned}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim shrink-0">
                          {picks.closed ? t('friends.noPick') : '—'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
