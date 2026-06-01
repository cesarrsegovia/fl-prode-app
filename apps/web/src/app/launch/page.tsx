'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Loader2 } from 'lucide-react';

function safeNext(raw: string | null): string {
  if (!raw) return '/home';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/home';
  return raw;
}

export default function LaunchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const ran = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = searchParams.get('authorizationCode');
    const next = safeNext(searchParams.get('next'));

    if (!code) {
      setError('Falta el parámetro authorizationCode');
      return;
    }

    signIn('provider-launch', {
      authorizationCode: code,
      redirect: false,
    })
      .then((res) => {
        if (!res || res.error) {
          setError('No se pudo validar la sesión con la plataforma');
          return;
        }
        router.replace(next);
      })
      .catch(() => setError('Error de conexión'));
  }, [searchParams, router]);

  return (
    <div className="flex w-full min-h-[calc(100vh-160px)] items-center justify-center p-4">
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
