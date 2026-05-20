'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Trophy } from 'lucide-react';
import type { FixtureWithMatches } from '@prode/shared';
import { fixtures } from '@/lib/endpoints';
import { apiClient } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyContent, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Countdown } from '@/components/prode/Countdown';
import { TeamFlag } from '@/components/torneo/TeamFlag';

interface TournamentSummary {
  id: string;
  name: string;
}

export default function ProdePage() {
  const [tournament, setTournament] = useState<TournamentSummary | null>(null);
  const [items, setItems] = useState<FixtureWithMatches[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<TournamentSummary>('/tournaments/active').then((r) => r.data).catch(() => null),
      fixtures.active(),
    ])
      .then(([tour, fx]) => {
        setTournament(tour);
        setItems(fx);
      })
      .catch((e) => setError(e?.message ?? 'Error al cargar fechas'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-10">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-2">
          Mi Prode
        </p>
        <h1 className="font-display font-extrabold text-foreground tracking-[-0.04em] text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]">
          Cargá<br />tus pronósticos.
        </h1>
        {tournament && (
          <Link
            href={`/torneo/${tournament.id}`}
            className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-xl bg-surface-1 border border-line hover:border-neon transition-colors"
          >
            <Trophy className="size-3.5 text-neon" />
            <span className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
              {tournament.name}
            </span>
            <ChevronRight className="size-3 text-ink-dim" />
          </Link>
        )}
      </header>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive font-bold">{error}</p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Sin fechas abiertas</EmptyTitle>
            <EmptyDescription>
              No hay fechas para pronosticar por ahora. Volvé pronto.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      <ul className="space-y-4">
        {items.map((fx) => {
          const previews = fx.matches.slice(0, 4);
          return (
            <li key={fx.id}>
              <Link
                href={`/prode/${fx.id}`}
                className="block group"
              >
                <Card className="bg-surface-1 border-line hover:border-neon/60 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div>
                        <h2 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
                          {fx.name ?? `Fecha ${fx.round}`}
                        </h2>
                        <p className="text-xs uppercase tracking-[0.18em] font-display font-bold text-ink-dim mt-1">
                          {fx.matches.length} partidos
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-muted mb-1">
                          Cierra en
                        </p>
                        <Countdown targetDate={new Date(fx.closeAt)} />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      {previews.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-2"
                        >
                          <TeamFlag size="xs" src={m.homeTeam?.flagUrl ?? null} alt={m.homeTeamName} />
                          <span className="text-[10px] font-display font-bold text-ink-muted">vs</span>
                          <TeamFlag size="xs" src={m.awayTeam?.flagUrl ?? null} alt={m.awayTeamName} />
                        </div>
                      ))}
                      {fx.matches.length > previews.length && (
                        <span className="text-xs font-display text-ink-dim">
                          +{fx.matches.length - previews.length}
                        </span>
                      )}
                    </div>

                    <div className="mt-5 flex items-center gap-1 text-xs font-display font-bold text-neon group-hover:underline">
                      Pronosticar
                      <ChevronRight className="size-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
