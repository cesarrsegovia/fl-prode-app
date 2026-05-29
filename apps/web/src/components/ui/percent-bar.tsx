import { cn } from '@/lib/utils';

type Tone = 'neon' | 'citrus' | 'grass';

const TONE_CLASS: Record<Tone, string> = {
  neon: 'bg-neon',
  citrus: 'bg-citrus',
  grass: 'bg-grass',
};

interface PercentBarProps {
  /** Valor actual. */
  value: number;
  /** Máximo (default 100). */
  max?: number;
  tone?: Tone;
  /** Etiqueta accesible (ej. "Local: 60%"). */
  label?: string;
  className?: string;
}

export function PercentBar({
  value,
  max = 100,
  tone = 'neon',
  label,
  className,
}: PercentBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-2', className)}
    >
      <div
        className={cn('h-full rounded-full transition-[width]', TONE_CLASS[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
