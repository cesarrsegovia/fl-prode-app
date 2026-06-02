'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ProdeForm } from '@/components/prode/ProdeForm';
import { Skeleton } from '@/components/ui/skeleton';
import { useFixtureWithPredictions } from '@/hooks/useFixtureWithPredictions';
import { useRoundName } from '@/lib/round-name';

export default function ProdeFechaPage({
  params,
}: {
  params: Promise<{ fechaId: string }>;
}) {
  const t = useTranslations('prode');
  const roundName = useRoundName();
  const { fechaId } = use(params);
  const { fixture, predictions, isLoading, error } =
    useFixtureWithPredictions(fechaId);

  if (error) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <p role="alert" className="text-sm text-destructive font-bold">
          {error instanceof Error ? error.message : t('fixture.loadError')}
        </p>
        <Link href="/prode" className="text-neon underline text-sm">
          {t('fixture.backToListLong')}
        </Link>
      </main>
    );
  }

  if (isLoading || !fixture) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <Skeleton className="h-64 w-full rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="pt-24 pb-32 px-4 max-w-3xl mx-auto">
      <Link
        href="/prode"
        className="text-[10px] font-display font-bold text-ink-muted hover:text-neon uppercase tracking-[0.18em]"
      >
        {t('fixture.backToList')}
      </Link>
      <header className="mt-3 mb-6">
        <p className="font-display text-xs uppercase tracking-[0.2em] text-neon mb-2">
          {t('list.eyebrow')}
        </p>
        <h1 className="font-display font-extrabold text-4xl text-foreground tracking-tight">
          {roundName(fixture.round)}
        </h1>
        <Link
          href={`/prode/${fixture.id}/resultados`}
          className="inline-block mt-2 text-sm text-neon hover:underline"
        >
          {t('fixture.viewResults')}
        </Link>
      </header>

      <ProdeForm fixture={fixture} initialPredictions={predictions} />
    </main>
  );
}
