'use client';

import { useEffect, useMemo, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Trophy, Check, AlertCircle } from 'lucide-react';
import {
  R32_BEST_THIRDS_TOTAL,
  R32_TOP2_PER_GROUP,
  R32_TOP2_TOTAL,
  R32_TOTAL_QUALIFIERS,
  R32PickKind,
} from '@prode/shared';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { r32Picks, type R32PickResponse } from '@/lib/endpoints';
import { TeamFlag } from './TeamFlag';
import { cn } from '@/lib/utils';

interface TeamOption {
  id: string;
  name: string;
  shortName: string | null;
  flagUrl: string | null;
  group: string | null;
}

interface Props {
  tournamentId: string;
  teams: TeamOption[];
}

type PickKind = R32PickKind;
type PicksState = Record<string, PickKind | undefined>;

function initialState(picks: R32PickResponse[]): PicksState {
  const out: PicksState = {};
  for (const p of picks) out[p.teamId] = p.kind;
  return out;
}

export function R32PicksCard({ tournamentId, teams }: Props) {
  const t = useTranslations('torneo.r32');
  const tCommon = useTranslations('torneo.common');
  const format = useFormatter();
  const [state, setState] = useState<PicksState>({});
  const [loaded, setLoaded] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      r32Picks.mine(tournamentId).catch(() => [] as R32PickResponse[]),
      r32Picks.deadline(tournamentId).catch(() => ({ deadline: null })),
    ]).then(([mine, d]) => {
      setState(initialState(mine));
      setDeadline(d.deadline ? new Date(d.deadline) : null);
      setLoaded(true);
    });
  }, [tournamentId]);

  const locked = deadline ? deadline.getTime() <= Date.now() : false;

  const teamsByGroup = useMemo(() => {
    const map = new Map<string, TeamOption[]>();
    for (const t of teams) {
      const key = t.group ?? '?';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [teams]);

  const counts = useMemo(() => {
    let top2 = 0;
    let thirds = 0;
    for (const k of Object.values(state)) {
      if (k === R32PickKind.TOP2) top2++;
      else if (k === R32PickKind.BEST_THIRD) thirds++;
    }
    return { top2, thirds, total: top2 + thirds };
  }, [state]);

  const top2ByGroup = useMemo(() => {
    const out = new Map<string, number>();
    for (const t of teams) {
      if (state[t.id] === R32PickKind.TOP2) {
        const g = t.group ?? '?';
        out.set(g, (out.get(g) ?? 0) + 1);
      }
    }
    return out;
  }, [teams, state]);

  const setKind = (teamId: string, kind: PickKind | undefined) => {
    setError(null);
    setSuccess(null);
    setState((prev) => {
      const next = { ...prev };
      if (!kind) delete next[teamId];
      else next[teamId] = kind;
      return next;
    });
  };

  const onTop2Click = (team: TeamOption) => {
    if (locked) return;
    const groupName = team.group ?? '?';
    const current = state[team.id];
    if (current === R32PickKind.TOP2) {
      setKind(team.id, undefined);
      return;
    }
    const groupCount = top2ByGroup.get(groupName) ?? 0;
    if (groupCount >= R32_TOP2_PER_GROUP) {
      setError(
        t('errTooManyTop2', { max: R32_TOP2_PER_GROUP, group: groupName }),
      );
      return;
    }
    setKind(team.id, R32PickKind.TOP2);
  };

  const onThirdClick = (team: TeamOption) => {
    if (locked) return;
    const current = state[team.id];
    if (current === R32PickKind.BEST_THIRD) {
      setKind(team.id, undefined);
      return;
    }
    if (current === R32PickKind.TOP2) {
      setError(t('errThirdIsTop2'));
      return;
    }
    if (counts.thirds >= R32_BEST_THIRDS_TOTAL) {
      setError(t('errTooManyThirds', { max: R32_BEST_THIRDS_TOTAL }));
      return;
    }
    setKind(team.id, R32PickKind.BEST_THIRD);
  };

  const submit = async () => {
    if (counts.total !== R32_TOTAL_QUALIFIERS) {
      setError(
        t('errIncomplete', { count: counts.total, total: R32_TOTAL_QUALIFIERS }),
      );
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = Object.entries(state)
        .filter(([, k]) => !!k)
        .map(([teamId, kind]) => ({ teamId, kind: kind as PickKind }));
      await r32Picks.set(tournamentId, payload);
      setSuccess(t('saved'));
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const nonTop2Teams = useMemo(
    () => teams.filter((t) => state[t.id] !== R32PickKind.TOP2),
    [teams, state],
  );

  return (
    <Card className="bg-surface-1 border-neon/30">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="size-4 text-neon" />
          <span className="font-display text-xs uppercase tracking-[0.25em] text-neon">
            {t('eyebrow')}
          </span>
        </div>
        <h3 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
          {t('title')}
        </h3>
        <p className="text-sm text-ink-muted mt-1">
          {t('subtitle')}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <Badge
            variant="outline"
            className={cn(counts.top2 === R32_TOP2_TOTAL && 'border-neon text-neon')}
          >
            {t('top2Badge', { count: counts.top2 })}
          </Badge>
          <Badge
            variant="outline"
            className={cn(counts.thirds === R32_BEST_THIRDS_TOTAL && 'border-neon text-neon')}
          >
            {t('thirdsBadge', { count: counts.thirds, total: R32_BEST_THIRDS_TOTAL })}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              counts.total === R32_TOTAL_QUALIFIERS && 'border-neon text-neon',
            )}
          >
            {t('totalBadge', { count: counts.total, total: R32_TOTAL_QUALIFIERS })}
          </Badge>
          {deadline && (
            <Badge variant="outline">
              {t('closesOn', {
                date: format.dateTime(deadline, {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                }),
              })}
            </Badge>
          )}
          {locked && (
            <Badge variant="outline" className="text-destructive border-destructive/50">
              {t('closed')}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!loaded ? (
          <p className="text-sm text-ink-muted">{tCommon('loading')}</p>
        ) : teams.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t('title')}</EmptyTitle>
              <EmptyDescription>{t('subtitle')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <>
            <div className="space-y-6">
              <section>
                <h4 className="font-display font-bold text-sm uppercase tracking-widest text-ink-muted mb-3">
                  {t('top2Section')}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamsByGroup.map(([groupName, gTeams]) => {
                    const filled = top2ByGroup.get(groupName) ?? 0;
                    return (
                      <div
                        key={groupName}
                        className="rounded-xl p-3 bg-surface-2"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-display font-bold text-foreground">
                            {tCommon('group', { name: groupName })}
                          </span>
                          <span
                            className={cn(
                              'text-xs font-bold',
                              filled === R32_TOP2_PER_GROUP
                                ? 'text-neon'
                                : 'text-ink-muted',
                            )}
                          >
                            {filled}/{R32_TOP2_PER_GROUP}
                          </span>
                        </div>
                        <div className="space-y-1">
                          {gTeams.map((team) => {
                            const isTop2 = state[team.id] === R32PickKind.TOP2;
                            const isThird =
                              state[team.id] === R32PickKind.BEST_THIRD;
                            return (
                              <button
                                key={team.id}
                                type="button"
                                onClick={() => onTop2Click(team)}
                                disabled={locked}
                                aria-pressed={isTop2}
                                className={cn(
                                  'w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                                  isTop2
                                    ? 'bg-neon/20 border border-neon/60'
                                    : 'hover:bg-surface-3 border border-transparent',
                                  locked && 'opacity-60 cursor-not-allowed',
                                )}
                              >
                                <TeamFlag
                                  size="sm"
                                  src={team.flagUrl}
                                  alt={team.name}
                                />
                                <span className="flex-1 text-sm text-foreground">
                                  {team.name}
                                </span>
                                {isTop2 && (
                                  <Check className="size-4 text-neon" />
                                )}
                                {isThird && (
                                  <span className="text-[10px] uppercase tracking-widest font-bold text-citrus">
                                    {t('thirdMark')}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h4 className="font-display font-bold text-sm uppercase tracking-widest text-ink-muted mb-3">
                  {t('thirdsSection', { count: counts.thirds, total: R32_BEST_THIRDS_TOTAL })}
                </h4>
                <p className="text-xs text-ink-muted mb-3">
                  {t('thirdsHelp')}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {nonTop2Teams.map((t) => {
                    const isThird = state[t.id] === R32PickKind.BEST_THIRD;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onThirdClick(t)}
                        disabled={locked}
                        aria-pressed={isThird}
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                          isThird
                            ? 'bg-citrus/20 border border-citrus/60'
                            : 'bg-surface-2 hover:bg-surface-3 border border-transparent',
                          locked && 'opacity-60 cursor-not-allowed',
                        )}
                      >
                        <TeamFlag size="sm" src={t.flagUrl} alt={t.name} />
                        <span className="flex-1 text-xs text-foreground truncate">
                          {t.shortName ?? t.name}
                        </span>
                        {isThird && (
                          <Check className="size-3.5 text-citrus" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            </div>

            {error && (
              <p role="alert" className="mt-4 text-sm font-bold text-destructive flex items-center gap-2">
                <AlertCircle className="size-4" />
                {error}
              </p>
            )}
            {success && (
              <p aria-live="polite" className="mt-4 text-sm font-bold text-neon">{success}</p>
            )}

            {!locked && (
              <button
                type="button"
                onClick={submit}
                disabled={
                  submitting || counts.total !== R32_TOTAL_QUALIFIERS
                }
                className="mt-6 w-full h-14 bg-neon text-primary-foreground font-extrabold text-lg rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting
                  ? tCommon('saving')
                  : t('submit', { count: counts.total, total: R32_TOTAL_QUALIFIERS })}
              </button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
