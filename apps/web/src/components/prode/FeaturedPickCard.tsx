'use client';

import Link from 'next/link';
import { Trophy, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  variant: 'champion' | 'topScorer';
  label: string;
  pickName: string | null;
  pickSubtitle?: string | null;
  pointsLabel: string;
  deadlineLabel: string;
  emptyLabel: string;
  href: string;
}

export function FeaturedPickCard({
  variant,
  label,
  pickName,
  pickSubtitle,
  pointsLabel,
  deadlineLabel,
  emptyLabel,
  href,
}: Props) {
  const Icon = variant === 'champion' ? Trophy : Target;
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
        'border-neon/30 bg-surface-1 hover:border-neon/60',
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="rounded-md bg-surface-2 p-2 text-neon">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-neon">
            {label} · {pointsLabel}
          </p>
          <p className="font-display font-extrabold text-foreground truncate">
            {pickName ?? emptyLabel}
          </p>
          {pickSubtitle && (
            <p className="text-[11px] text-ink-muted truncate">
              {pickSubtitle}
            </p>
          )}
        </div>
      </div>
      <span className="text-[11px] text-ink-muted shrink-0">
        {deadlineLabel}
      </span>
    </Link>
  );
}
