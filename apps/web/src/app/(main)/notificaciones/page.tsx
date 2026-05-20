'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  CheckCheck,
  Clock,
  Trophy,
  Calculator,
  Users,
  Sparkles,
} from 'lucide-react';
import { notificaciones, type NotificationDto } from '@/lib/endpoints';
import { useNotificacionStore } from '@/store/notificacionStore';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

type NotificationType = NotificationDto['type'];

const TYPE_META: Record<
  string,
  { icon: typeof Bell; label: string; tone: 'neon' | 'citrus' | 'grass' }
> = {
  FIXTURE_CLOSING: { icon: Clock, label: 'Cierre próximo', tone: 'citrus' },
  RESULT_CALCULATED: { icon: Calculator, label: 'Puntos', tone: 'neon' },
  RANKING_CHANGE: { icon: Trophy, label: 'Ranking', tone: 'neon' },
  GROUP_INVITE: { icon: Users, label: 'Grupo', tone: 'grass' },
  ACHIEVEMENT_UNLOCKED: { icon: Sparkles, label: 'Logro', tone: 'neon' },
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'hace un momento';
  if (minutes < 60) return `hace ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours}h`;
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default function NotificacionesPage() {
  const setNotifications = useNotificacionStore((s) => s.setNotifications);
  const markAllReadStore = useNotificacionStore((s) => s.markAllRead);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    notificaciones
      .list()
      .then((res) => {
        setItems(res);
        setNotifications(res as unknown as Parameters<typeof setNotifications>[0]);
      })
      .finally(() => setLoading(false));
  }, [setNotifications]);

  const toggleRead = async (n: NotificationDto) => {
    if (n.read) return;
    setItems((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
    );
    await notificaciones.markOneRead(n.id).catch(() => undefined);
  };

  const markAll = async () => {
    await notificaciones.markAllRead().catch(() => undefined);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    markAllReadStore();
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-10 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-2">
            Inbox
          </p>
          <h1 className="font-display font-extrabold text-foreground tracking-[-0.04em] text-[clamp(2.5rem,7vw,5rem)] leading-[0.95]">
            Notificaciones.
          </h1>
        </div>
        {unread > 0 && (
          <button
            onClick={markAll}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-1 border border-line hover:border-neon font-display font-bold text-xs uppercase tracking-[0.15em] text-ink-muted hover:text-neon transition-colors"
          >
            <CheckCheck className="size-3.5" />
            Marcar todo como leído ({unread})
          </button>
        )}
      </header>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Inbox vacío</EmptyTitle>
            <EmptyDescription>
              Cuando se calculen puntos, se acerque un cierre o subas en el
              ranking, las verás acá.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const meta = TYPE_META[n.type] ?? {
              icon: Bell,
              label: 'Notif.',
              tone: 'neon' as const,
            };
            const Icon = meta.icon;
            const toneColor =
              meta.tone === 'neon'
                ? 'bg-neon/15 text-neon'
                : meta.tone === 'citrus'
                  ? 'bg-citrus/15 text-citrus'
                  : 'bg-grass/15 text-grass';
            return (
              <li key={n.id}>
                <button
                  onClick={() => toggleRead(n)}
                  className="w-full text-left"
                >
                  <Card
                    className={cn(
                      'transition-colors',
                      n.read
                        ? 'bg-surface-1 border-line/40'
                        : 'bg-surface-1 border-neon/40 ring-1 ring-neon/10',
                    )}
                  >
                    <CardContent className="p-4 flex items-start gap-3">
                      <div
                        className={cn(
                          'size-10 rounded-lg flex items-center justify-center shrink-0',
                          toneColor,
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-muted">
                            {meta.label}
                          </p>
                          {!n.read && (
                            <span className="size-1.5 rounded-full bg-neon animate-pulse" />
                          )}
                        </div>
                        <p className="text-sm text-foreground">{n.message}</p>
                        <p className="text-[10px] uppercase tracking-[0.18em] font-display text-ink-dim mt-2">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
