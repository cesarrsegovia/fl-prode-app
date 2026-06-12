'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Target, Check } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PlayerPhoto } from '@/components/torneo/PlayerPhoto';
import {
  topScorerPick,
  tournamentPlayers,
  type TopScorerPickResponse,
  type TournamentPlayerDto,
} from '@/lib/endpoints';
import { positionKey } from '@/lib/player-labels';
import { FlagCombobox } from './FlagCombobox';

interface Props {
  tournamentId: string;
}

export function TopScorerPickCard({ tournamentId }: Props) {
  const t = useTranslations('torneo.topScorer');
  const tCommon = useTranslations('torneo.common');
  const tPlayer = useTranslations('common.player');
  const tCombo = useTranslations('torneo.combobox');
  const [players, setPlayers] = useState<TournamentPlayerDto[]>([]);
  const [current, setCurrent] = useState<TopScorerPickResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      tournamentPlayers.list(tournamentId),
      topScorerPick.mine(tournamentId),
      topScorerPick.deadline(tournamentId),
    ])
      .then(([list, mine, dl]) => {
        if (!alive) return;
        setPlayers(list);
        setCurrent(mine);
        setDeadline(dl.deadline ? new Date(dl.deadline) : null);
      })
      .catch((e) => alive && setError(e?.message ?? null))
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, [tournamentId]);

  const locked = deadline ? deadline <= new Date() : false;

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
            <PlayerPhoto
              src={current.player.photoUrl}
              alt={current.player.name}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-neon">
                {t('currentPick')}
              </p>
              <p className="font-display font-extrabold text-foreground truncate">
                {current.player.name}
              </p>
              {current.player.position && (
                <p className="text-[11px] text-ink-muted">
                  {positionKey(current.player.position)
                    ? tPlayer(`positions.${positionKey(current.player.position)}`)
                    : current.player.position}
                </p>
              )}
            </div>
            <Check className="size-5 shrink-0 text-neon" />
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
        ) : locked && current ? null : !locked ? (
          <FlagCombobox
            options={players.map((p) => ({
              id: p.playerId,
              label: p.name,
              sublabel: `${p.team.shortName ?? p.team.name}${p.number !== null ? ` · #${p.number}` : ''}`,
              image: <PlayerPhoto src={p.photoUrl} alt={p.name} size="sm" />,
            }))}
            value={current?.playerId}
            disabled={submitting !== null}
            placeholder={tCombo('select')}
            searchPlaceholder={tCombo('search')}
            noResultsLabel={tCombo('noResults')}
            onSelect={(id) => pick(id)}
          />
        ) : (
          <p className="text-sm text-ink-muted">{t('locked')}</p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive font-bold mt-3">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
