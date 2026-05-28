'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Target, Check } from 'lucide-react';
import { topScorerPickDeadline } from '@prode/shared';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  topScorerPick,
  tournamentPlayers,
  type TopScorerPickResponse,
  type TournamentPlayerDto,
} from '@/lib/endpoints';
import { cn } from '@/lib/utils';

interface Props {
  tournamentId: string;
  tournamentStartDate: string | null;
  topScorerDeadline?: string | null;
}

interface PlayerGroup {
  teamId: string;
  teamName: string;
  players: TournamentPlayerDto[];
}

export function TopScorerPickCard({
  tournamentId,
  tournamentStartDate,
  topScorerDeadline: deadlineOverride,
}: Props) {
  const t = useTranslations('torneo.topScorer');
  const tCommon = useTranslations('torneo.common');
  const [players, setPlayers] = useState<TournamentPlayerDto[]>([]);
  const [current, setCurrent] = useState<TopScorerPickResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      tournamentPlayers.list(tournamentId),
      topScorerPick.mine(tournamentId),
    ])
      .then(([list, mine]) => {
        if (!alive) return;
        setPlayers(list);
        setCurrent(mine);
      })
      .catch((e) => alive && setError(e?.message ?? null))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [tournamentId]);

  const deadline = useMemo(() => {
    if (deadlineOverride) return new Date(deadlineOverride);
    if (tournamentStartDate) return topScorerPickDeadline(new Date(tournamentStartDate));
    return null;
  }, [tournamentStartDate, deadlineOverride]);

  const locked = deadline ? deadline <= new Date() : false;

  const grouped: PlayerGroup[] = useMemo(() => {
    const map = new Map<string, PlayerGroup>();
    for (const p of players) {
      const k = p.team.id;
      if (!map.has(k)) {
        map.set(k, { teamId: k, teamName: p.team.name, players: [] });
      }
      map.get(k)!.players.push(p);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.teamName.localeCompare(b.teamName),
    );
  }, [players]);

  const pick = async (playerId: string) => {
    if (locked) return;
    setSubmitting(playerId);
    setError(null);
    try {
      const next = await topScorerPick.set(tournamentId, playerId);
      setCurrent(next);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      const status = err?.response?.status;
      const fallback = err?.message ?? t('saveError');
      setError(apiMsg ?? (status ? `${status}: ${fallback}` : fallback));
      console.error('TopScorerPick set error', err);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card className="bg-surface-1 border-neon/30">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Target className="size-4 text-neon" />
          <span className="font-display text-xs uppercase tracking-[0.25em] text-neon">
            {t('eyebrow')}
          </span>
        </div>
        <h3 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
          {current ? t('titleChange') : t('titleInitial')}
        </h3>
        <p className="text-sm text-ink-muted mt-1">{t('subtitle')}</p>
        {current && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-neon/10 border border-neon/40">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-neon">
                {t('currentPick')}
              </p>
              <p className="font-display font-extrabold text-foreground">
                {current.player.name}
              </p>
              {current.player.position && (
                <p className="text-[11px] text-ink-muted">
                  {current.player.position}
                </p>
              )}
            </div>
            <Check className="size-5 text-neon" />
          </div>
        )}
        {locked && (
          <Badge variant="outline" className="mt-3 w-fit">
            {t('locked')}
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {!loaded ? (
          <p className="text-sm text-ink-muted">{tCommon('loading')}</p>
        ) : players.length === 0 ? (
          <p className="text-sm text-ink-muted">{t('emptyPlayers')}</p>
        ) : (
          <div className="space-y-4">
            {grouped.map((g) => (
              <div key={g.teamId}>
                <h4 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-ink-muted mb-2">
                  {g.teamName}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {g.players.map((p) => {
                    const isMine = current?.playerId === p.playerId;
                    const isSaving = submitting === p.playerId;
                    return (
                      <button
                        key={p.playerId}
                        onClick={() => pick(p.playerId)}
                        disabled={locked || isSaving}
                        title={p.name}
                        className={cn(
                          'flex flex-col items-start gap-1 p-2 rounded-lg border text-left transition-all',
                          isMine
                            ? 'border-neon bg-neon/10 glow-neon'
                            : 'border-line/40 hover:border-neon/60 hover:bg-surface-2',
                          (locked || isSaving) && 'opacity-60',
                        )}
                      >
                        <span className="font-display font-bold text-xs text-foreground truncate w-full">
                          {p.name}
                        </span>
                        <span className="text-[10px] text-ink-muted">
                          {p.position ?? '—'}
                          {p.number !== null ? ` · #${p.number}` : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive font-bold mt-3">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
