'use client';

import { cn } from '@/lib/utils';

export interface PillTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface PillTabsProps<T extends string> {
  tabs: PillTab<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

export function PillTabs<T extends string>({
  tabs,
  value,
  onValueChange,
  className,
  'aria-label': ariaLabel,
}: PillTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('flex gap-2 overflow-x-auto no-scrollbar', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-xs font-display font-black uppercase tracking-widest transition-all',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon',
              active
                ? 'bg-neon text-primary-foreground'
                : 'bg-surface-1 text-ink-muted hover:text-foreground',
            )}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={cn(
                  'ml-1.5 tabular-nums',
                  active ? 'text-primary-foreground/70' : 'text-ink-dim',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
