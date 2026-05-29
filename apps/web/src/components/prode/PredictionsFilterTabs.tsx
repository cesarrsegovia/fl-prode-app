'use client';

import { useTranslations } from 'next-intl';
import { PillTabs, type PillTab } from '@/components/ui/pill-tabs';

export type PredictionsFilter =
  | 'pending'
  | 'predicted'
  | 'live'
  | 'results'
  | 'topScorer';

const ORDER: PredictionsFilter[] = [
  'pending',
  'predicted',
  'live',
  'results',
  'topScorer',
];

interface Props {
  value: PredictionsFilter;
  onChange: (v: PredictionsFilter) => void;
  counts?: Partial<Record<PredictionsFilter, number>>;
}

export function PredictionsFilterTabs({ value, onChange, counts }: Props) {
  const t = useTranslations('prode.tabs');
  const tabs: PillTab<PredictionsFilter>[] = ORDER.map((k) => ({
    value: k,
    label: t(k),
    count: counts?.[k],
  }));

  return (
    <div className="-mx-4 px-4">
      <PillTabs
        tabs={tabs}
        value={value}
        onValueChange={onChange}
        aria-label={t('aria')}
      />
    </div>
  );
}
