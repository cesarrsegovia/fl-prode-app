'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Lock, Loader2, Users } from 'lucide-react';
import { grupos, type GroupPreview } from '@/lib/endpoints';

export default function InvitacionPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const { status } = useSession();

  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    grupos
      .preview(code)
      .then((g) => {
        if (!cancelled) setPreview(g);
      })
      .catch((e) => {
        if (cancelled) return;
        const m = e?.response?.data?.message;
        setError(m ?? 'No encontramos esta invitación');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const goToAuth = () => {
    const next = encodeURIComponent(`/invitacion/${code}`);
    router.push(`/auth?next=${next}`);
  };

  const handleJoin = async () => {
    if (!preview) return;
    setJoining(true);
    setError(null);
    try {
      await grupos.join(code);
      router.push(`/grupos/${preview.id}`);
    } catch (e: unknown) {
      const m =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'No se pudo unir al grupo';
      setError(m);
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-md mx-auto">
        <div
          className="h-64 rounded-2xl animate-pulse"
          style={{ background: 'var(--surface-container-low)' }}
        />
      </main>
    );
  }

  if (error || !preview) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-md mx-auto text-center">
        <p className="font-display font-extrabold text-xl text-foreground mb-2">
          Invitación inválida
        </p>
        <p className="text-sm text-on-surface-variant mb-6">
          {error ?? 'Esta invitación no existe o fue revocada.'}
        </p>
        <Link
          href="/home"
          className="inline-block bg-primary text-black font-bold text-sm px-5 py-3 rounded-xl active:scale-95 transition-transform"
        >
          Ir al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-24 px-4 max-w-md mx-auto">
      <section
        className="rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface-container-low)' }}
      >
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-3">
          Te invitan a un grupo
        </p>
        <h1 className="font-display font-extrabold text-3xl text-white tracking-tight mb-2">
          {preview.name}
        </h1>
        {preview.description && (
          <p className="text-sm text-on-surface-variant mb-4">
            {preview.description}
          </p>
        )}

        <div className="flex items-center justify-center gap-4 text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-8">
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {preview._count.members} miembros
          </span>
          <span className="flex items-center gap-1">
            <Lock className="size-3" />
            {preview.isPrivate ? 'Privado' : 'Público'}
          </span>
        </div>

        {status === 'loading' ? (
          <div className="h-12 rounded-xl animate-pulse" style={{ background: 'var(--surface-container-highest)' }} />
        ) : status === 'authenticated' ? (
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full bg-primary text-black font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {joining ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uniéndote…
              </>
            ) : (
              'Unirme al grupo'
            )}
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-on-surface-variant">
              Necesitás una cuenta para unirte.
            </p>
            <button
              onClick={goToAuth}
              className="w-full bg-primary text-black font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform"
            >
              Iniciar sesión o registrarme
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs text-red-400 font-bold">{error}</p>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-on-surface-variant">
        Código: <span className="font-mono">{code}</span>
      </p>
    </main>
  );
}
