'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { readStoredLocale } from '@/i18n/client-locale';

/**
 * Mantiene el idioma elegido a través de recargas/navegaciones dentro del
 * iframe, donde las cookies de tercero se bloquean.
 *
 * Si el server renderizó en un idioma distinto al guardado en localStorage
 * (porque la URL no traía `?lang=`), recarga una sola vez agregando `?lang=xx`.
 * El middleware lo reenvía al server y el render sale en el idioma correcto.
 */
export function LocaleBootstrap() {
  const current = useLocale();

  useEffect(() => {
    const stored = readStoredLocale();
    if (!stored || stored === current) return;
    const url = new URL(window.location.href);
    // Evita bucle: solo redirige si la URL todavía no fija el idioma guardado.
    if (url.searchParams.get('lang') === stored) return;
    url.searchParams.set('lang', stored);
    window.location.replace(url.toString());
  }, [current]);

  return null;
}
