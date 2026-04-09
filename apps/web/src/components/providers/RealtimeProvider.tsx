'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRealtimeStore } from '@/store/useRealtimeStore';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { connect, disconnect } = useRealtimeStore();

  useEffect(() => {
    // We only connect globally if the user is authenticated (or you can adjust if public)
    if (status === 'authenticated' && session) {
      // Assuming session contains a token we can use
      // @ts-ignore - session type might need augmenting
      const token = session.accessToken || session.token;
      connect(token as string);
    }

    return () => {
      disconnect();
    };
  }, [status, session, connect, disconnect]);

  return <>{children}</>;
}
