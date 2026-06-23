'use client';

import { memo } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ActivityFeedType, ActivityItem } from '@/lib/endpoints';
import { UserAvatar } from '@/components/ui/user-avatar';
import { displayName } from '@/lib/display-name';

const ICONS: Record<ActivityFeedType, string> = {
  MEMBER_JOINED: '👋',
  PREDICTIONS_SUBMITTED: '🎯',
  POINTS_EARNED: '⭐',
  RANK_UP: '📈',
  BRACKET_PICK: '🏆',
  ACHIEVEMENT_UNLOCKED: '🏅',
};

const ACCENTS: Record<ActivityFeedType, string> = {
  MEMBER_JOINED: 'border-l-grass',
  PREDICTIONS_SUBMITTED: 'border-l-citrus',
  POINTS_EARNED: 'border-l-neon',
  RANK_UP: 'border-l-grass',
  BRACKET_PICK: 'border-l-citrus',
  ACHIEVEMENT_UNLOCKED: 'border-l-neon',
};

/**
 * Item memoizado: cuando llega una actividad nueva por WebSocket y se prepende
 * a la lista, React.memo evita re-renderizar los items previos (sus props no
 * cambian). En un feed activo con 100 items, solo se monta el nuevo.
 */
const ActivityRow = memo(function ActivityRow({ item }: { item: ActivityItem }) {
  const format = useFormatter();
  return (
    <li
      className={`flex items-start gap-3 p-3 rounded-xl border-l-4 bg-surface-1 ${ACCENTS[item.type] ?? 'border-l-line'}`}
    >
      <span className="text-xl leading-none mt-0.5" aria-hidden>
        {ICONS[item.type] ?? '•'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-tight">{item.message}</p>
        <p className="text-xs text-ink-muted mt-1">
          {format.relativeTime(new Date(item.createdAt))}
        </p>
      </div>
      <UserAvatar
        name={displayName(item.user.username, item.user.id)}
        image={item.user.avatarUrl}
        size="sm"
      />
    </li>
  );
});

export function ActivityFeed({
  items,
  isLoading,
  error,
}: {
  items: ActivityItem[];
  isLoading: boolean;
  error: string | null;
}) {
  const t = useTranslations('grupos.activity');

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl animate-pulse bg-surface-1"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p role="alert" className="text-sm text-destructive font-bold">{error}</p>;
  }

  if (!items.length) {
    return (
      <div className="rounded-2xl p-8 text-center bg-surface-1">
        <p className="text-sm text-ink-muted">
          {t('emptyTitle')}
        </p>
        <p className="text-xs text-ink-muted mt-1">
          {t('emptyDesc')}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <ActivityRow key={item.id} item={item} />
      ))}
    </ul>
  );
}
