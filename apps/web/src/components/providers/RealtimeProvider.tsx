'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRealtimeStore } from '@/store/useRealtimeStore';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { connect, disconnect } = useRealtimeStore();

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const token = session.accessToken;
      if (token) {
        connect(token);
      }
    }

    return () => {
      disconnect();
    };
  }, [status, session, connect, disconnect]);

  return <>{children}</>;
}
