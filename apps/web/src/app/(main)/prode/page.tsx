'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { FixtureWithMatches } from '@prode/shared';
import { fixtures } from '@/lib/endpoints';
import { Countdown } from '@/components/prode/Countdown';

export default function ProdePage() {
  const [items, setItems] = useState<FixtureWithMatches[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fixtures
      .active()
      .then(setItems)
      .catch((e) => setError(e?.message ?? 'Error al cargar fechas'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <main className="pt-24 pb-32 px-4 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Mi Prode
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Pronosticá los partidos de cada fecha antes del cierre.
        </p>
      </header>

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl animate-pulse"
              style={{ background: 'var(--surface-container-low)' }}
            />
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400 font-bold">{error}</p>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <p className="text-sm text-on-surface-variant">
            No hay fechas abiertas por ahora. Volvé pronto.
          </p>
        </div>
      )}

      <ul className="space-y-4">
        {items.map((fx) => (
          <li key={fx.id}>
            <Link
              href={`/prode/${fx.id}`}
              className="block rounded-2xl p-6 border border-white/5 transition-all hover:border-primary/40"
              style={{ background: 'var(--surface-container-low)' }}
            >
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold text-white">
                  Fecha {fx.round}
                </h2>
                <Countdown targetDate={new Date(fx.closeAt)} />
              </div>
              <p className="text-sm text-on-surface-variant">
                {fx.matches.length} partidos
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
