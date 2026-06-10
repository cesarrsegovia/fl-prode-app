'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Target, Check, Search } from 'lucide-react';
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
import { cn } from '@/lib/utils';

interface Props {
  tournamentId: string;
}

const FORWARD = 'Attacker';

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function TopScorerPickCard({ tournamentId }: Props) {
  const t = useTranslations('torneo.topScorer');
  const tCommon = useTranslations('torneo.common');
  const tPlayer = useTranslations('common.player');
  const [players, setPlayers] = useState<TournamentPlayerDto[]>([]);
  const [current, setCurrent] = useState<TopScorerPickResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [otherTeamId, setOtherTeamId] = useState('');
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

  // Selecciones (para el dropdown "¿Otro jugador?"), ordenadas por nombre.
  const teams = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const p of players) {
      if (!map.has(p.team.id))
        map.set(p.team.id, { id: p.team.id, name: p.team.name });
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [players]);

  const forwards = useMemo(
    () => players.filter((p) => p.position === FORWARD),
    [players],
  );

  // Resultados de búsqueda: sobre TODOS los jugadores (no solo delanteros).
  const searchResults = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return null;
    return players
      .filter(
        (p) => normalize(p.name).includes(q) || normalize(p.team.name).includes(q),
      )
      .slice(0, 30);
  }, [query, players]);

  // Plantel de la selección elegida en el dropdown.
  const otherSquad = useMemo(() => {
    if (!otherTeamId) return null;
    return players.filter((p) => p.team.id === otherTeamId);
  }, [otherTeamId, players]);

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

  const renderPlayer = (p: TournamentPlayerDto) => {
    const isMine = current?.playerId === p.playerId;
    const isSaving = submitting === p.playerId;
    return (
      <button
        key={p.playerId}
        onClick={() => pick(p.playerId)}
        disabled={locked || isSaving}
        title={`${p.name} · ${p.team.name}`}
        aria-pressed={isMine}
        className={cn(
          'flex items-center gap-2 p-2 rounded-lg border text-left transition-all',
          isMine
            ? 'border-neon bg-neon/10 glow-neon'
            : 'border-line/40 hover:border-neon/60 hover:bg-surface-2',
          (locked || isSaving) && 'opacity-60',
        )}
      >
        <PlayerPhoto src={p.photoUrl} alt={p.name} size="sm" />
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-xs text-foreground truncate">
            {p.name}
          </span>
          <span className="block text-[10px] text-ink-muted truncate">
            {p.team.shortName ?? p.team.name}
            {p.number !== null ? ` · #${p.number}` : ''}
          </span>
        </span>
        {isMine && <Check className="size-4 shrink-0 text-neon" />}
      </button>
    );
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
        ) : (
          <div className="space-y-5">
            {/* Buscador (sobre todos los jugadores) */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                disabled={locked}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface-2 border border-line/40 text-sm text-foreground placeholder:text-ink-muted focus:border-neon/60 focus:outline-none disabled:opacity-60"
              />
            </div>

            {searchResults ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {searchResults.map(renderPlayer)}
              </div>
            ) : (
              <>
                {/* Delanteros (default) */}
                <div>
                  <h4 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-ink-muted mb-2">
                    {t('forwardsLabel')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {forwards.map(renderPlayer)}
                  </div>
                </div>

                {/* ¿Otro jugador? -> dropdown de selección */}
                <div className="pt-2 border-t border-line/30">
                  <h4 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-ink-muted mb-2">
                    {t('otherPlayerLabel')}
                  </h4>
                  <select
                    value={otherTeamId}
                    onChange={(e) => setOtherTeamId(e.target.value)}
                    disabled={locked}
                    className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-line/40 text-sm text-foreground focus:border-neon/60 focus:outline-none disabled:opacity-60"
                  >
                    <option value="">{t('selectTeamPlaceholder')}</option>
                    {teams.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                  {otherSquad && otherSquad.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {otherSquad.map(renderPlayer)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
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
