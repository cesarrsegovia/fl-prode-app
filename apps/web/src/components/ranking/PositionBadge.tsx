'use client';

import { useTranslations } from 'next-intl';

const medalClasses: Record<number, string> = {
  1: 'bg-medal-gold text-background',
  2: 'bg-medal-silver text-background',
  3: 'bg-medal-bronze text-background',
};

export function PositionBadge({ position }: { position: number }) {
  const t = useTranslations('ranking');
  const classes = medalClasses[position] ?? 'bg-surface-2 text-foreground';

  return (
    <span
      aria-label={t('position', { n: position })}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${classes}`}
    >
      {position}
    </span>
  );
}
