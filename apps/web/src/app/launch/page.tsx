'use client';

import { useEffect, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

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
              <span
                className="animate-spin material-symbols-outlined text-primary-container text-4xl"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                progress_activity
              </span>
            </div>
            <p className="text-on-surface-variant text-sm font-medium tracking-wide uppercase">
              Iniciando tu sesión…
            </p>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-error text-5xl">
              error
            </span>
            <h1 className="text-2xl font-bold text-white">No pudimos ingresarte</h1>
            <p className="text-sm text-on-surface-variant">{error}</p>
            <button
              type="button"
              className="text-primary-container font-bold hover:underline"
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
