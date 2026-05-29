'use client';

import { useTranslations } from 'next-intl';
import { useCountdown } from '@/hooks/useCountdown';

export function Countdown({ targetDate }: { targetDate: Date }) {
  const t = useTranslations('prode.countdown');
  const { days, hours, minutes, seconds, expired } = useCountdown(targetDate);

  if (expired) {
    return <span className="text-destructive font-medium">{t('closed')}</span>;
  }

  return (
    <span className="font-mono text-sm text-neon">
      {days > 0 && `${days}d `}
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
      {String(seconds).padStart(2, '0')}
    </span>
  );
}
