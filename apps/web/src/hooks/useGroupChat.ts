'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { WS_EVENTS } from '@prode/shared';
import { messages, type ChatMessage } from '@/lib/endpoints';
import { useRealtimeStore } from '@/store/useRealtimeStore';

export function useGroupChat(groupId: string | null | undefined) {
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const inFlightRef = useRef(0);

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

  // Devuelve el mensaje creado (con su id real) en éxito, o null si falló de
  // verdad. Permite envíos concurrentes (no rechaza por concurrencia): el
  // estado `sending` solo refleja el botón mientras hay al menos un envío en
  // curso, sin marcar como fallido lo que no tuvo error real.
  const send = useCallback(
    async (content: string): Promise<ChatMessage | null> => {
      const trimmed = content.trim();
      if (!groupId || !trimmed) return null;
      inFlightRef.current += 1;
      setSending(true);
      try {
        const created = await messages.send(groupId, trimmed);
        return created;
      } catch (e: unknown) {
        const message =
          (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'No se pudo enviar el mensaje';
        setError(message);
        return null;
      } finally {
        inFlightRef.current -= 1;
        if (inFlightRef.current === 0) setSending(false);
      }
    },
    [groupId],
  );

  return { items, isLoading, error, send, sending };
}
