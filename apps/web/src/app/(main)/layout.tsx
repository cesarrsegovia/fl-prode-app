'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { useIsEmbedded } from '@/hooks/useEmbed';
import { requestReauth } from '@/lib/bridge';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const embedded = useIsEmbedded();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'unauthenticated') return;
    if (embedded) {
      // Embebido: pedir un authorizationCode fresco al casino en vez de /auth.
      requestReauth();
    } else {
      router.replace('/auth');
    }
  }, [status, embedded, router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="pt-24 px-4 max-w-3xl mx-auto">
        <div
          className="h-64 rounded-2xl animate-pulse"
          style={{ background: 'var(--surface-container-low)' }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
