'use client';

import { useEffect, useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { adminMatches } from '@/lib/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { cn } from '@/lib/utils';

interface AdminFixture {
  id: string;
  round: number;
  name: string | null;
  closeAt: string;
  matches: Array<{
    id: string;
    stage: string;
    startTime: string;
    status: 'PENDING' | 'LIVE' | 'FINISHED' | 'CANCELLED';
    homeScore: number | null;
    awayScore: number | null;
    homeTeamName: string;
    awayTeamName: string;
    homeTeam?: { name: string; flagUrl: string | null } | null;
    awayTeam?: { name: string; flagUrl: string | null } | null;
    venue?: { name: string; city: string | null } | null;
    group?: { name: string } | null;
  }>;
}

const STATUSES: AdminFixture['matches'][number]['status'][] = [
  'PENDING',
  'LIVE',
  'FINISHED',
  'CANCELLED',
];

interface TournamentInfo {
  id: string;
  name: string;
}

export default function AdminPartidosPage() {
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [fixtures, setFixtures] = useState<AdminFixture[]>([]);
  const [activeFixtureId, setActiveFixtureId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<TournamentInfo>('/tournaments/active')
      .then(async (r) => {
        if (!r.data) {
          setLoading(false);
          return;
        }
        setTournament(r.data);
        const sched = await apiClient.get<AdminFixture[]>(
          `/tournaments/${r.data.id}/schedule`,
        );
        setFixtures(sched.data);
        setActiveFixtureId(sched.data[0]?.id ?? null);
      })
      .catch((e) => setError(e?.message ?? 'Error cargando datos'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive font-bold">{error}</p>;
  }

  if (!tournament || !fixtures.length) {
    return (
      <p className="text-sm text-ink-muted">
        No hay torneo activo o sin partidos cargados.
      </p>
    );
  }

  const activeFixture = fixtures.find((f) => f.id === activeFixtureId);

  return (
    <div>
      <p className="font-display text-sm text-ink-muted mb-6">
        Editando resultados de <strong>{tournament.name}</strong>
      </p>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {fixtures.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFixtureId(f.id)}
            className={cn(
              'shrink-0 px-4 py-2 rounded-full text-xs font-display font-bold uppercase tracking-[0.15em] transition-colors',
              f.id === activeFixtureId
                ? 'bg-neon text-primary-foreground'
                : 'bg-surface-1 text-ink-muted hover:text-foreground hover:bg-surface-2',
            )}
          >
            {f.name ?? `Fecha ${f.round}`}
          </button>
        ))}
      </div>

      {activeFixture && (
        <div className="space-y-3">
          {activeFixture.matches.map((m) => (
            <MatchEditor
              key={m.id}
              match={m}
              onUpdated={(next) => {
                setFixtures((all) =>
                  all.map((fx) =>
                    fx.id !== activeFixture.id
                      ? fx
                      : {
                          ...fx,
                          matches: fx.matches.map((mm) =>
                            mm.id === next.id ? { ...mm, ...next } : mm,
                          ),
                        },
                  ),
                );
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MatchEditor({
  match,
  onUpdated,
}: {
  match: AdminFixture['matches'][number];
  onUpdated: (m: Partial<AdminFixture['matches'][number]> & { id: string }) => void;
}) {
  const [homeScore, setHomeScore] = useState<string>(
    match.homeScore?.toString() ?? '',
  );
  const [awayScore, setAwayScore] = useState<string>(
    match.awayScore?.toString() ?? '',
  );
  const [status, setStatus] = useState(match.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty =
    homeScore !== (match.homeScore?.toString() ?? '') ||
    awayScore !== (match.awayScore?.toString() ?? '') ||
    status !== match.status;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof adminMatches.update>[1] = { status };
      if (homeScore !== '') payload.homeScore = Number(homeScore);
      if (awayScore !== '') payload.awayScore = Number(awayScore);
      await adminMatches.update(match.id, payload);
      onUpdated({
        id: match.id,
        homeScore: homeScore === '' ? null : Number(homeScore),
        awayScore: awayScore === '' ? null : Number(awayScore),
        status,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const kickoff = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(match.startTime));

  return (
    <Card className="bg-surface-1 border-line">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <TeamFlag
              size="sm"
              src={match.homeTeam?.flagUrl ?? null}
              alt={match.homeTeam?.name ?? match.homeTeamName}
            />
            <span className="font-display font-semibold text-sm text-foreground truncate">
              {match.homeTeam?.name ?? match.homeTeamName}
            </span>
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              placeholder="-"
              className="w-12 h-9 bg-surface-2 border border-line rounded text-center text-base font-display font-extrabold tabular-nums focus:outline-none focus:border-neon"
            />
            <span className="text-ink-dim font-bold">-</span>
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              placeholder="-"
              className="w-12 h-9 bg-surface-2 border border-line rounded text-center text-base font-display font-extrabold tabular-nums focus:outline-none focus:border-neon"
            />
            <span className="font-display font-semibold text-sm text-foreground truncate">
              {match.awayTeam?.name ?? match.awayTeamName}
            </span>
            <TeamFlag
              size="sm"
              src={match.awayTeam?.flagUrl ?? null}
              alt={match.awayTeam?.name ?? match.awayTeamName}
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as AdminFixture['matches'][number]['status'])
              }
              className="h-9 bg-surface-2 border border-line rounded px-2 text-xs font-display font-bold uppercase tracking-wider focus:outline-none focus:border-neon"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={handleSave}
              disabled={!dirty || saving}
              className={cn(
                'h-9 px-4 rounded font-display font-extrabold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 transition-all',
                dirty && !saving
                  ? 'bg-neon text-primary-foreground hover:glow-neon'
                  : 'bg-surface-2 text-ink-dim',
              )}
            >
              {saving ? (
                <Loader2 className="size-3 animate-spin" />
              ) : saved ? (
                'Guardado'
              ) : (
                <>
                  <Save className="size-3" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim">
          <span>{kickoff}</span>
          {match.group && (
            <>
              <span>·</span>
              <span className="text-neon">Grupo {match.group.name}</span>
            </>
          )}
          {match.venue && (
            <>
              <span>·</span>
              <span className="truncate">{match.venue.name}</span>
            </>
          )}
        </div>

        {error && (
          <Badge variant="destructive" className="mt-2">
            {error}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
