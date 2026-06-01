'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('grupos.invitePage');

  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);

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
        setError(m ?? t('notFound'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code, t]);

  // Once authenticated, check whether the user is already in this group so we
  // can offer "go to group" instead of a join that would fail with a 409.
  useEffect(() => {
    if (status !== 'authenticated' || !preview) return;
    let cancelled = false;
    grupos
      .mine()
      .then((groups) => {
        if (cancelled) return;
        setAlreadyMember(groups.some((g) => g.group.id === preview.id));
      })
      .catch(() => {
        /* non-blocking: fall back to the normal join flow */
      });
    return () => {
      cancelled = true;
    };
  }, [status, preview]);

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
        t('joinError');
      setError(m);
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-md mx-auto">
        <div className="h-64 rounded-2xl animate-pulse bg-surface-1" />
      </main>
    );
  }

  if (error || !preview) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-md mx-auto text-center">
        <p className="font-display font-extrabold text-xl text-foreground mb-2">
          {t('invalidTitle')}
        </p>
        <p className="text-sm text-ink-muted mb-6">
          {error ?? t('invalidDesc')}
        </p>
        <Link
          href="/home"
          className="inline-block bg-neon text-primary-foreground font-bold text-sm px-5 py-3 rounded-xl active:scale-95 transition-transform"
        >
          {t('goHome')}
        </Link>
      </main>
    );
  }

  return (
    <main className="pt-24 pb-24 px-4 max-w-md mx-auto">
      <section className="rounded-2xl p-8 text-center bg-surface-1">
        <p className="text-xs uppercase tracking-[0.2em] font-bold text-ink-muted mb-3">
          {t('eyebrow')}
        </p>
        <h1 className="font-display font-extrabold text-3xl text-foreground tracking-tight mb-2">
          {preview.name}
        </h1>
        {preview.description && (
          <p className="text-sm text-ink-muted mb-4">
            {preview.description}
          </p>
        )}

        <div className="flex items-center justify-center gap-4 text-xs uppercase tracking-widest font-bold text-ink-muted mb-8">
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {t('members', { count: preview._count.members })}
          </span>
          <span className="flex items-center gap-1">
            <Lock className="size-3" />
            {preview.isPrivate ? t('private') : t('public')}
          </span>
        </div>

        {status === 'loading' ? (
          <div className="h-12 rounded-xl animate-pulse bg-surface-2" />
        ) : status === 'authenticated' ? (
          alreadyMember ? (
            <div className="space-y-3">
              <p className="text-xs text-ink-muted">{t('alreadyMember')}</p>
              <Link
                href={`/grupos/${preview.id}`}
                className="block w-full bg-neon text-primary-foreground font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform"
              >
                {t('goToGroup')}
              </Link>
            </div>
          ) : (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full bg-neon text-primary-foreground font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {joining ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> {t('joining')}
                </>
              ) : (
                t('join')
              )}
            </button>
          )
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-ink-muted">
              {t('needAccount')}
            </p>
            <button
              onClick={goToAuth}
              className="w-full bg-neon text-primary-foreground font-bold text-sm py-3 rounded-xl active:scale-95 transition-transform"
            >
              {t('signIn')}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs text-destructive font-bold" role="alert">{error}</p>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-ink-muted">
        {t('codeLabel')} <span className="font-mono">{code}</span>
      </p>
    </main>
  );
}
