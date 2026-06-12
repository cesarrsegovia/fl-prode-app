'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Globe } from 'lucide-react';
import { locales, localeLabels, type Locale } from '@/i18n/config';
import { setUserLocale } from '@/i18n/locale';
import { LOCALE_STORAGE_KEY } from '@/i18n/client-locale';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

/**
 * Selector de idioma. Dentro del iframe cross-site las cookies de tercero se
 * bloquean, así que el mecanismo principal es cookieless: guardamos la elección
 * en localStorage (first-party al iframe) y recargamos con `?lang=xx`, que el
 * middleware reenvía al server. Igual seteamos la cookie best-effort para el
 * uso standalone.
 */
export function LanguageSwitcher() {
  const t = useTranslations('nav');
  const current = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  function onSelect(locale: Locale) {
    if (locale === current) return;
    startTransition(async () => {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
      } catch {
        // localStorage puede estar bloqueado; seguimos con la URL igual.
      }
      // Cookie best-effort (standalone). En el iframe se ignora, no bloquea.
      try {
        await setUserLocale(locale);
      } catch {
        // Server action puede fallar en el iframe; el `?lang=` resuelve igual.
      }
      const url = new URL(window.location.href);
      url.searchParams.set('lang', locale);
      // Reload completo para que el server re-renderice con el nuevo idioma.
      window.location.assign(url.toString());
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
