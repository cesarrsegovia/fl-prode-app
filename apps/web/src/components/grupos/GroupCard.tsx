'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { MyGroupEntry } from '@/lib/endpoints';

export function GroupCard({ entry }: { entry: MyGroupEntry }) {
  const t = useTranslations('grupos.card');
  const { group, role } = entry;
  const memberCount = group._count?.members ?? 0;

  return (
    <Link
      href={`/grupos/${group.id}`}
      className="block rounded-2xl p-6 border border-line bg-surface-1 transition-all hover:border-neon/40 hover:-translate-y-0.5"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-foreground">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-ink-muted mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
        </div>
        {role === 'ADMIN' && (
          <span className="text-[10px] font-black uppercase tracking-widest bg-neon/10 text-neon px-2 py-1 rounded-full">
            {t('admin')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-line">
        <div className="flex items-center gap-2 text-ink-muted">
          <span className="text-sm font-bold">{memberCount}</span>
          <span className="text-xs uppercase tracking-widest">
            {t('members', { count: memberCount })}
          </span>
        </div>
        {group.isPrivate && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
            {t('private')}
          </span>
        )}
      </div>
    </Link>
  );
}
