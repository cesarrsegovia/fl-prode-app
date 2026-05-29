'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { locales, localeLabels, type Locale } from '@/i18n/config';
import { setUserLocale } from '@/i18n/locale';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

/**
 * Selector de idioma. Persiste la elección en la cookie vía server action y
 * refresca los server components para re-renderizar en el nuevo idioma.
 */
export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const current = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onSelect(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      await setUserLocale(locale);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isPending}
        aria-label={t('language.label')}
        className="flex items-center gap-1.5 size-9 md:size-auto md:px-2.5 rounded-full justify-center text-ink-muted hover:text-neon hover:bg-surface-1 transition-colors disabled:opacity-50"
      >
        <Globe className="size-5" />
        <span className="hidden md:block text-xs font-display font-bold uppercase tracking-widest">
          {current}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-44">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => onSelect(l)}
            className={l === current ? 'text-neon' : 'text-foreground'}
          >
            {localeLabels[l]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
