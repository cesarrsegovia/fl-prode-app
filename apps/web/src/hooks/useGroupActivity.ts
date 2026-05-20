'use client';

import { useEffect, useState } from 'react';
import { WS_EVENTS } from '@prode/shared';
import { activity, type ActivityItem } from '@/lib/endpoints';
import { useRealtimeStore } from '@/store/useRealtimeStore';

export function useGroupActivity(groupId: string | null | undefined) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const socket = useRealtimeStore((s) => s.socket);
  const joinGroup = useRealtimeStore((s) => s.joinGroup);
  const leaveGroup = useRealtimeStore((s) => s.leaveGroup);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    activity
      .byGroup(groupId)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message ?? 'No se pudo cargar la actividad');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  useEffect(() => {
    if (!socket || !groupId) return;
    joinGroup(groupId);
    const onNew = (item: ActivityItem) => {
      if (item.groupId !== groupId) return;
      setItems((prev) => {
        if (prev.some((p) => p.id === item.id)) return prev;
        return [item, ...prev].slice(0, 100);
      });
    };
    socket.on(WS_EVENTS.ACTIVITY_NEW, onNew);
    return () => {
      socket.off(WS_EVENTS.ACTIVITY_NEW, onNew);
      leaveGroup(groupId);
    };
  }, [socket, groupId, joinGroup, leaveGroup]);

  return { items, isLoading, error };
}
