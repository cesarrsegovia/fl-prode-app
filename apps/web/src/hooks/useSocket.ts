'use client';

import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { connectSocket, disconnectSocket } from '@/lib/socket';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  return socketRef;
}
