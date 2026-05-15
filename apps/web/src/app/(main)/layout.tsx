'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth');
    }
  }, [status, router]);

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
