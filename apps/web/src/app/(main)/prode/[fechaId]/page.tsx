'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { FixtureWithMatches, Prediction } from '@prode/shared';
import { fixtures, pronosticos } from '@/lib/endpoints';
import { ProdeForm } from '@/components/prode/ProdeForm';

export default function ProdeFechaPage({
  params,
}: {
  params: Promise<{ fechaId: string }>;
}) {
  const t = useTranslations('prode');
  const { fechaId } = use(params);
  const [fixture, setFixture] = useState<FixtureWithMatches | null>(null);
  const [preds, setPreds] = useState<Prediction[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fixtures.one(fechaId),
      pronosticos.byFixture(fechaId).catch(() => []),
    ])
      .then(([fx, ps]) => {
        setFixture(fx);
        setPreds(ps as Prediction[]);
      })
      .catch((e) => setError(e?.message ?? t('fixture.loadError')));
  }, [fechaId]);

  if (error) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <p className="text-sm text-red-400 font-bold">{error}</p>
        <Link href="/prode" className="text-primary underline text-sm">
          {t('fixture.backToListLong')}
        </Link>
      </main>
    );
  }

  if (!fixture) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <div
          className="h-64 rounded-2xl animate-pulse"
          style={{ background: 'var(--surface-container-low)' }}
        />
      </main>
    );
  }

  return (
    <main className="pt-24 pb-32 px-4 max-w-3xl mx-auto">
      <Link
        href="/prode"
        className="text-xs font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest"
      >
        {t('fixture.backToList')}
      </Link>
      <header className="mt-2 mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          {t('fixture.fallbackName', { round: fixture.round })}
        </h1>
        <p className="text-sm text-on-surface-variant">
          <Link
            href={`/prode/${fixture.id}/resultados`}
            className="text-primary hover:underline"
          >
            {t('fixture.viewResults')}
          </Link>
        </p>
      </header>

      <ProdeForm fixture={fixture} initialPredictions={preds ?? []} />
    </main>
  );
}
