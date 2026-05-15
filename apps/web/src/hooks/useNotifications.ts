'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { WS_EVENTS } from '@prode/shared';
import type { Notification } from '@prode/shared';
import { notificaciones as api } from '@/lib/endpoints';
import { useNotificacionStore } from '@/store/notificacionStore';
import { useRealtimeStore } from '@/store/useRealtimeStore';

export function useNotifications() {
  const { status } = useSession();
  const socket = useRealtimeStore((s) => s.socket);
  const { notifications, unreadCount, setNotifications, addNotification, markAllRead } =
    useNotificacionStore();

  useEffect(() => {
    if (status !== 'authenticated') return;
    api
      .list()
      .then((list) => setNotifications(list as unknown as Notification[]))
      .catch(() => undefined);
  }, [status, setNotifications]);

  useEffect(() => {
    if (!socket) return;
    const onNew = (notif: Notification) => addNotification(notif);
    socket.on(WS_EVENTS.NOTIFICATION_NEW, onNew);
    return () => {
      socket.off(WS_EVENTS.NOTIFICATION_NEW, onNew);
    };
  }, [socket, addNotification]);

  const markRead = async () => {
    await api.markAllRead().catch(() => undefined);
    markAllRead();
  };

  return { notifications, unreadCount, markRead };
}
