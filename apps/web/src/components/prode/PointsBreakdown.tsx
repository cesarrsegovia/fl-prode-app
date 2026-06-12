'use client';

import { useTranslations } from 'next-intl';
import {
  pointsBreakdown,
  type MatchResultParts,
  type PredictionParts,
} from '@/lib/points-breakdown';
import { cn } from '@/lib/utils';

export function PointsBreakdown({
  pred,
  match,
}: {
  pred: PredictionParts;
  match: MatchResultParts;
}) {
  const t = useTranslations('mis-pronosticos.breakdown');
  const b = pointsBreakdown(pred, match);
  if (!b) return null;

  return (
    <div className="flex flex-col items-end gap-0.5 text-[10px] font-display font-bold uppercase tracking-[0.12em]">
      <span
        className={cn(
          'tabular-nums text-sm',
          b.total > 0 ? 'text-neon' : 'text-ink-dim',
        )}
      >
        {t('total', { points: b.total })}
      </span>
      {b.total > 0 && (
        <span className="text-ink-muted normal-case tracking-normal">
          {t('winner', { points: b.winner })}
          {b.exact > 0 && ` · ${t('exact', { points: b.exact })}`}
          {b.captainBonus > 0 && ` · ${t('captain')}`}
        </span>
      )}
    </div>
  );
}
