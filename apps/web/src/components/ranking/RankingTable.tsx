'use client';

import { useTranslations } from 'next-intl';
import type { RankingEntry } from '@prode/shared';
import { PositionBadge } from './PositionBadge';
import { UserAvatar } from '@/components/ui/user-avatar';

interface Props {
  entries: RankingEntry[];
  isLoading?: boolean;
  highlightUserId?: string;
}

export function RankingTable({ entries, isLoading, highlightUserId }: Props) {
  const t = useTranslations('ranking');
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-xl animate-pulse bg-surface-1"
          />
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="rounded-xl p-8 text-center bg-surface-1">
        <p className="text-sm text-ink-muted">
          {t('empty')}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e) => {
        const isMe = highlightUserId && e.userId === highlightUserId;
        return (
          <li
            key={e.userId}
            className={`flex items-center gap-4 p-4 rounded-xl transition-colors bg-surface-1 ${
              isMe ? 'ring-2 ring-neon' : ''
            }`}
          >
            <PositionBadge position={e.position} />
            <UserAvatar name={e.username} image={e.avatarUrl ?? null} size="default" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground truncate">{e.username}</p>
              <div className="hidden sm:flex items-center gap-2 mt-0.5 text-[10px] font-bold text-ink-muted">
                <span title={t('subStats.correctWinners')}>
                  <span aria-hidden="true">✓</span>
                  <span className="sr-only">{t('subStats.correctWinners')}: </span>
                  {e.correctWinners ?? 0}
                </span>
                <span title={t('subStats.exactScores')}>
                  <span aria-hidden="true">🎯</span>
                  <span className="sr-only">{t('subStats.exactScores')}: </span>
                  {e.exactScores ?? 0}
                </span>
                <span title={t('subStats.exactGoalsSum')}>
                  <span aria-hidden="true">⚽</span>
                  <span className="sr-only">{t('subStats.exactGoalsSum')}: </span>
                  {e.exactGoalsSum ?? 0}
                </span>
              </div>
              {e.streak > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-neon mt-0.5">
                  {t('streak', { count: e.streak })}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-foreground">{e.total}</p>
              <p className="text-[10px] font-bold uppercase text-ink-muted">
                {t('points')}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
