'use client';

import { useCountdown } from '@/hooks/useCountdown';

export function Countdown({ targetDate }: { targetDate: Date }) {
  const { days, hours, minutes, seconds, expired } = useCountdown(targetDate);

  if (expired) {
    return <span className="text-red-400 font-medium">Cerrado</span>;
  }

  return (
    <span className="font-mono text-sm" style={{ color: 'var(--accent-primary)' }}>
      {days > 0 && `${days}d `}
      {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:
      {String(seconds).padStart(2, '0')}
    </span>
  );
}
