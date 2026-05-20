'use client';

import { useCallback, useEffect, useState } from 'react';
import { WS_EVENTS } from '@prode/shared';
import { messages, type ChatMessage } from '@/lib/endpoints';
import { useRealtimeStore } from '@/store/useRealtimeStore';

export function useGroupChat(groupId: string | null | undefined) {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const socket = useRealtimeStore((s) => s.socket);
  const joinGroup = useRealtimeStore((s) => s.joinGroup);
  const leaveGroup = useRealtimeStore((s) => s.leaveGroup);

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    messages
      .byGroup(groupId)
      .then((list) => {
        if (!cancelled) setItems(list);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.message ?? 'No se pudo cargar el chat');
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
    const onNew = (msg: ChatMessage) => {
      if (msg.groupId !== groupId) return;
      setItems((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].slice(-200);
      });
    };
    socket.on(WS_EVENTS.MESSAGE_NEW, onNew);
    return () => {
      socket.off(WS_EVENTS.MESSAGE_NEW, onNew);
      leaveGroup(groupId);
    };
  }, [socket, groupId, joinGroup, leaveGroup]);

  const send = useCallback(
    async (content: string) => {
      const trimmed = content.trim();
      if (!groupId || !trimmed || sending) return;
      setSending(true);
      try {
        await messages.send(groupId, trimmed);
      } catch (e: unknown) {
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'No se pudo enviar el mensaje';
        setError(message);
      } finally {
        setSending(false);
      }
    },
    [groupId, sending],
  );

  return { items, isLoading, error, send, sending };
}
