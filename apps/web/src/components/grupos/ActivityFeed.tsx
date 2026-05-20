'use client';

import type { ActivityFeedType, ActivityItem } from '@/lib/endpoints';

const ICONS: Record<ActivityFeedType, string> = {
  MEMBER_JOINED: '👋',
  PREDICTIONS_SUBMITTED: '🎯',
  POINTS_EARNED: '⭐',
  RANK_UP: '📈',
  BRACKET_PICK: '🏆',
  ACHIEVEMENT_UNLOCKED: '🏅',
};

const ACCENTS: Record<ActivityFeedType, string> = {
  MEMBER_JOINED: 'border-l-sky-400',
  PREDICTIONS_SUBMITTED: 'border-l-violet-400',
  POINTS_EARNED: 'border-l-primary',
  RANK_UP: 'border-l-emerald-400',
  BRACKET_PICK: 'border-l-amber-400',
  ACHIEVEMENT_UNLOCKED: 'border-l-pink-400',
};

function formatRelative(iso: string) {
  const ts = new Date(iso).getTime();
  const diffSec = Math.floor((Date.now() - ts) / 1000);
  if (diffSec < 60) return 'ahora';
  if (diffSec < 3600) return `hace ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `hace ${Math.floor(diffSec / 3600)} h`;
  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `hace ${days} d`;
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
  });
}

export function ActivityFeed({
  items,
  isLoading,
  error,
}: {
  items: ActivityItem[];
  isLoading: boolean;
  error: string | null;
}) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl animate-pulse"
            style={{ background: 'var(--surface-container-low)' }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-red-400 font-bold">{error}</p>;
  }

  if (!items.length) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{ background: 'var(--surface-container-low)' }}
      >
        <p className="text-sm text-on-surface-variant">
          Todavía no hay actividad en este grupo.
        </p>
        <p className="text-xs text-on-surface-variant mt-1">
          Cuando carguen pronósticos o se calculen puntos vas a verlo acá.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className={`flex items-start gap-3 p-3 rounded-xl border-l-4 ${ACCENTS[item.type] ?? 'border-l-white/10'}`}
          style={{ background: 'var(--surface-container-low)' }}
        >
          <span className="text-xl leading-none mt-0.5" aria-hidden>
            {ICONS[item.type] ?? '•'}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white leading-tight">{item.message}</p>
            <p className="text-xs text-on-surface-variant mt-1">
              {formatRelative(item.createdAt)}
            </p>
          </div>
          {item.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.user.avatarUrl}
              alt={item.user.username}
              className="h-8 w-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black shrink-0"
              style={{ background: 'var(--surface-container-highest)' }}
            >
              {item.user.username.slice(0, 2).toUpperCase()}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
