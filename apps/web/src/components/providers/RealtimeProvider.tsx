'use client';

import { useEffect } from 'react';
import { useSession } from '@/lib/session';
import { useRealtimeStore } from '@/store/useRealtimeStore';

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  // Seleccionamos cada acción por separado en vez de desestructurar el store
  // entero: así este provider (que envuelve TODO el árbol) no re-renderiza cada
  // vez que cambian socket/isConnected. Las acciones de Zustand son estables.
  const connect = useRealtimeStore((s) => s.connect);
  const disconnect = useRealtimeStore((s) => s.disconnect);

  useEffect(() => {
    if (status === 'authenticated' && session) {
      const token = session.accessToken;
      const userId = (session.user as { id?: string } | undefined)?.id;
      if (token) connect(token, userId);
    }
    return () => {
      disconnect();
    };
  }, [status, session, connect, disconnect]);

  return <>{children}</>;
}
