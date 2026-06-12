'use client';

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboOption {
  id: string;
  label: string;
  sublabel?: string;
  image?: ReactNode;
}

interface Props {
  options: ComboOption[];
  value?: string;
  disabled?: boolean;
  placeholder: string;
  searchPlaceholder: string;
  noResultsLabel: string;
  onSelect: (id: string) => void;
}

function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

export function FlagCombobox({
  options,
  value,
  disabled,
  placeholder,
  searchPlaceholder,
  noResultsLabel,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return options;
    return options.filter(
      (o) => normalize(o.label).includes(q) || (o.sublabel && normalize(o.sublabel).includes(q)),
    );
  }, [query, options]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    inputRef.current?.focus();
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface-2 border border-line/40 text-left text-sm text-foreground transition-all',
          'hover:border-neon/60 focus:outline-none focus:ring-1 focus:ring-neon',
          disabled && 'opacity-60 pointer-events-none',
        )}
      >
        {selected?.image}
        <span className={cn('flex-1 min-w-0 truncate font-display font-bold', !selected && 'text-ink-muted')}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-muted" />
      </button>

      {open && (
        <div className="mt-1 w-full rounded-lg border border-line/40 bg-surface-1 shadow-xl">
          <div className="relative p-2 border-b border-line/30">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-ink-muted" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-2 py-1.5 rounded-md bg-surface-2 border border-line/40 text-sm focus:border-neon/60 focus:outline-none"
            />
          </div>
          <ul role="listbox" id={listId} className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-ink-muted text-center">{noResultsLabel}</li>
            ) : (
              filtered.map((o) => {
                const isSel = o.id === value;
                return (
                  <li key={o.id} role="option" aria-selected={isSel}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(o.id);
                        setOpen(false);
                        setQuery('');
                      }}
                      className={cn(
                        'w-full flex items-center gap-2 px-2 py-2 rounded-md text-left transition-colors',
                        isSel ? 'bg-neon/10 text-neon' : 'hover:bg-surface-2',
                      )}
                    >
                      {o.image}
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-display font-bold truncate">{o.label}</span>
                        {o.sublabel && (
                          <span className="block text-[11px] text-ink-muted truncate">{o.sublabel}</span>
                        )}
                      </span>
                      {isSel && <Check className="size-4 shrink-0 text-neon" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
