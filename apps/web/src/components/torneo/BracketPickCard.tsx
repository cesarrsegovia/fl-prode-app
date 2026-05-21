'use client';

import { useEffect, useMemo, useState } from 'react';
import { Trophy, Check } from 'lucide-react';
import { championPickDeadline } from '@prode/shared';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { bracketPick, type BracketPickResponse } from '@/lib/endpoints';
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
  tournamentStartDate: string | null;
  teams: TeamOption[];
}

export function BracketPickCard({
  tournamentId,
  tournamentStartDate,
  teams,
}: Props) {
  const [current, setCurrent] = useState<BracketPickResponse | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    bracketPick
      .mine(tournamentId)
      .then((pick) => {
        setCurrent(pick);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [tournamentId]);

  const lockedAt = useMemo(
    () =>
      tournamentStartDate
        ? championPickDeadline(new Date(tournamentStartDate))
        : null,
    [tournamentStartDate],
  );
  const locked = lockedAt ? lockedAt <= new Date() : false;

  const teamsByConfederation = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.group && b.group && a.group !== b.group) {
        return a.group.localeCompare(b.group);
      }
      return a.name.localeCompare(b.name);
    });
  }, [teams]);

  const pick = async (teamId: string) => {
    setSubmitting(teamId);
    setError(null);
    try {
      const next = await bracketPick.set(tournamentId, teamId);
      setCurrent(next);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      const status = err?.response?.status;
      const fallback = err?.message ?? 'No se pudo guardar tu predicción';
      setError(apiMsg ?? (status ? `${status}: ${fallback}` : fallback));
      console.error('BracketPick set error', err);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card className="bg-surface-1 border-neon/30">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="size-4 text-neon" />
          <span className="font-display text-xs uppercase tracking-[0.25em] text-neon">
            Predicción del campeón
          </span>
        </div>
        <h3 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
          {current ? '¿Cambiás de candidato?' : '¿Quién levanta la copa?'}
        </h3>
        <p className="text-sm text-ink-muted mt-1">
          Elegí una selección antes del inicio del torneo. Bonus al final si
          acertás.
        </p>
        {current && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-neon/10 border border-neon/40">
            <TeamFlag
              size="md"
              src={current.champTeam.flagUrl}
              alt={current.champTeam.name}
            />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-neon">
                Tu pick actual
              </p>
              <p className="font-display font-extrabold text-foreground">
                {current.champTeam.name}
              </p>
            </div>
            <Check className="size-5 text-neon" />
          </div>
        )}
        {locked && (
          <Badge variant="outline" className="mt-3 w-fit">
            Predicciones cerradas
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {!loaded ? (
          <p className="text-sm text-ink-muted">Cargando...</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {teamsByConfederation.map((t) => {
              const isMine = current?.champTeamId === t.id;
              const isSaving = submitting === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => pick(t.id)}
                  disabled={locked || isSaving}
                  title={t.name}
                  className={cn(
                    'flex flex-col items-center gap-2 p-2 rounded-lg border transition-all',
                    isMine
                      ? 'border-neon bg-neon/10 glow-neon'
                      : 'border-line/40 hover:border-neon/60 hover:bg-surface-2',
                    (locked || isSaving) && 'opacity-60',
                  )}
                >
                  <TeamFlag size="md" src={t.flagUrl} alt={t.name} />
                  <span className="text-[10px] font-display font-bold text-ink-muted truncate w-full text-center">
                    {t.shortName ?? t.name}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive font-bold mt-3">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
