'use client';

import { useCallback, useEffect, useState } from 'react';
import type { RankingEntry } from '@prode/shared';
import { WS_EVENTS } from '@prode/shared';
import { ranking } from '@/lib/endpoints';
import { useRealtimeStore } from '@/store/useRealtimeStore';

export function useRanking(groupId?: string) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const socket = useRealtimeStore((s) => s.socket);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    const req = groupId ? ranking.group(groupId) : ranking.global();
    req
      .then(setEntries)
      .catch((err) => {
        console.error('ranking load', err);
        setError(err);
      })
      .finally(() => setIsLoading(false));
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onUpdate = () => load();
    socket.on(WS_EVENTS.RANKING_UPDATE, onUpdate);
    return () => {
      socket.off(WS_EVENTS.RANKING_UPDATE, onUpdate);
    };
  }, [socket, load]);

  return { entries, isLoading, error, refetch: load };
}
