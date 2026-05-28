'use client';

import { useTranslations } from 'next-intl';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

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
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-neon transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs font-display font-bold">
          <span className="text-ink-muted">{t('pending', { pending })}</span>
          <span className="text-foreground">{t('percent', { pct })}</span>
        </div>
      </CardContent>
    </Card>
  );
}
