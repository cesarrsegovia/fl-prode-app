'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-3">
          Algo salió mal
        </p>
        <h1 className="font-display font-extrabold text-foreground tracking-[-0.04em] text-[clamp(2.5rem,6vw,4rem)] leading-[0.95] mb-6">
          Penal fallado.
        </h1>
        <p className="text-sm text-ink-muted mb-8">
          Tuvimos un problema procesando esta página. Intentá de nuevo o volvé al inicio.
        </p>
        {error.digest && (
          <p className="text-[10px] uppercase tracking-[0.2em] font-display text-ink-dim mb-6">
            Ref: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} className="font-display font-bold">
            Reintentar
          </Button>
          <Link href="/home">
            <Button variant="outline" className="font-display font-bold">
              Ir al inicio
            </Button>
          </Link>
        </div>
      </div>
    </main>
  );
}
