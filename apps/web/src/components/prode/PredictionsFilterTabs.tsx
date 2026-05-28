'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

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
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2 w-max">
        {ORDER.map((k) => {
          const active = value === k;
          const count = counts?.[k];
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(k)}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-display font-bold transition-colors',
                active
                  ? 'bg-neon text-primary-foreground'
                  : 'bg-surface-2 text-ink-muted hover:bg-surface-3 hover:text-foreground',
              )}
            >
              <span>{t(k)}</span>
              {typeof count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-[10px]',
                    active
                      ? 'bg-primary-foreground/20'
                      : 'bg-foreground/10 text-foreground',
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
