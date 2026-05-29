'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PercentBar } from '@/components/ui/percent-bar';

interface Props {
  predicted: number;
  total: number;
}

export function PredictionsProgressCard({ predicted, total }: Props) {
  const t = useTranslations('prode.progress');
  const pending = Math.max(total - predicted, 0);
  const pct = total > 0 ? Math.round((predicted / total) * 100) : 0;

  return (
    <Card className="bg-surface-1 border-line">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display font-extrabold text-lg text-foreground">
              {t('title')}
            </h3>
            <p className="text-sm text-ink-muted mt-0.5">
              {t('predicted', { predicted, total })}
            </p>
          </div>
          <div className="rounded-md bg-surface-2 p-2 text-neon">
            <TrendingUp size={18} />
          </div>
        </div>
        <PercentBar
          value={predicted}
          max={total}
          tone="neon"
          label={t('percent', { pct })}
          className="mt-3"
        />
        <div className="mt-2 flex items-center justify-between text-xs font-display font-bold">
          <span className="text-ink-muted">{t('pending', { pending })}</span>
          <span className="text-foreground">{t('percent', { pct })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
