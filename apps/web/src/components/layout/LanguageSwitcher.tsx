'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { locales, localeLabels, type Locale } from '@/i18n/config';
import { setUserLocale } from '@/i18n/locale';

/**
 * Selector de idioma. Persiste la elección en la cookie vía server action y
 * refresca los server components para re-renderizar en el nuevo idioma.
 */
export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const current = useLocale() as Locale;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  function onSelect(locale: Locale) {
    setOpen(false);
    if (locale === current) return;
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        aria-label={t('language.label')}
        className="flex items-center gap-1.5 size-9 md:size-auto md:px-2.5 rounded-full justify-center text-ink-muted hover:text-neon hover:bg-surface-1 transition-colors disabled:opacity-50"
      >
        <Globe className="size-5" />
        <span className="hidden md:block text-xs font-display font-bold uppercase tracking-widest">
          {current}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-line bg-surface-2 shadow-elev overflow-hidden">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onSelect(l)}
              className={cn(
                'block w-full text-left px-4 py-3 text-sm font-display font-semibold transition-colors hover:bg-surface-3 border-t border-line first:border-t-0',
                l === current ? 'text-neon' : 'text-foreground',
              )}
            >
              {localeLabels[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
