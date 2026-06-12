'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn } from '@/lib/session';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';
import { locales } from '@/i18n/config';
import { LOCALE_STORAGE_KEY } from '@/i18n/client-locale';

function safeNext(raw: string | null): string {
  if (!raw) return '/home';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/home';
  return raw;
}

/** Idioma válido pedido en la URL del launch (`?lang=`), o null. */
function safeLang(raw: string | null): string | null {
  const v = (raw ?? '').trim().toLowerCase();
  return (locales as readonly string[]).includes(v) ? v : null;
}

/** Agrega `?lang=` a una ruta interna preservando otros params. */
function withLang(path: string, lang: string | null): string {
  if (!lang) return path;
  const [base, hash] = path.split('#');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}lang=${lang}${hash ? `#${hash}` : ''}`;
}

export default function LaunchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    // Aceptamos `authorizationCode` (contrato) o `token` (game_url del agregador).
    const code =
      searchParams.get('authorizationCode') || searchParams.get('token');
    const next = safeNext(searchParams.get('next'));
    // Idioma cookieless: gamblor (o el switcher) puede pasar `?lang=`. Lo
    // persistimos en localStorage y lo arrastramos al `next` para que el
    // server renderice en ese idioma dentro del iframe.
    const lang = safeLang(searchParams.get('lang'));
    if (lang) {
      try {
        window.localStorage.setItem(LOCALE_STORAGE_KEY, lang);
      } catch {
        // localStorage bloqueado: el `?lang=` en la URL resuelve igual.
      }
    }

    if (!code) {
      setError('Falta el parámetro authorizationCode');
      return;
    }

    signIn('provider-launch', {
      authorizationCode: code,
      redirect: false,
    })
      .then((res) => {
        if (!('ok' in res) || !res.ok) {
          setError('No se pudo validar la sesión con la plataforma');
          return;
        }
        router.replace(withLang(next, lang));
      })
      .catch(() => setError('Error de conexión'));
  }, [searchParams, router]);

  return (
    <div className="flex w-full min-h-[calc(100vh-160px)] items-center justify-center px-4 pt-24 pb-8">
      <main className="w-full max-w-[420px] text-center space-y-6">
        {!error ? (
          <>
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="size-9 animate-spin text-neon" />
            </div>
            <p className="text-ink-muted text-sm font-medium tracking-wide uppercase">
              Iniciando tu sesión…
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="mx-auto size-12 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">No pudimos ingresarte</h1>
            <p className="text-sm text-ink-muted">{error}</p>
            <button
              type="button"
              className="text-neon font-bold hover:underline"
              onClick={() => router.replace('/auth')}
            >
              Ir al login manual
            </button>
          </>
        )}
      </main>
    </div>
  );
}
