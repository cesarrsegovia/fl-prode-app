'use client';

import type { RankingEntry } from '@prode/shared';
import { PositionBadge } from './PositionBadge';

interface Props {
  entries: RankingEntry[];
  isLoading?: boolean;
  highlightUserId?: string;
}

export function RankingTable({ entries, isLoading, highlightUserId }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-14 rounded-xl animate-pulse"
            style={{ background: 'var(--surface-container-low)' }}
          />
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div
        className="rounded-xl p-8 text-center"
        style={{ background: 'var(--surface-container-low)' }}
      >
        <p className="text-sm text-on-surface-variant">
          Todavía no hay datos en el ranking.
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
            className={`flex items-center gap-4 p-4 rounded-xl transition-colors ${
              isMe ? 'ring-2 ring-primary' : ''
            }`}
            style={{ background: 'var(--surface-container-low)' }}
          >
            <PositionBadge position={e.position} />
            {e.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.avatarUrl}
                alt={e.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-sm font-bold text-white">
                {e.username?.slice(0, 2).toUpperCase() ?? '??'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-white truncate">{e.username}</p>
              {e.streak > 0 && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Racha x{e.streak}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-white">{e.total}</p>
              <p className="text-[10px] font-bold uppercase text-on-surface-variant">
                pts
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
