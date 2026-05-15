'use client';

import Link from 'next/link';
import type { MyGroupEntry } from '@/lib/endpoints';

export function GroupCard({ entry }: { entry: MyGroupEntry }) {
  const { group, role } = entry;
  const memberCount = group._count?.members ?? 0;

  return (
    <Link
      href={`/grupos/${group.id}`}
      className="block rounded-2xl p-6 border border-white/5 transition-all hover:border-primary/40 hover:-translate-y-0.5"
      style={{ background: 'var(--surface-container-low)' }}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{group.name}</h3>
          {group.description && (
            <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">
              {group.description}
            </p>
          )}
        </div>
        {role === 'ADMIN' && (
          <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-full">
            Admin
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-on-surface-variant">
          <span className="text-sm font-bold">{memberCount}</span>
          <span className="text-xs uppercase tracking-widest">
            {memberCount === 1 ? 'miembro' : 'miembros'}
          </span>
        </div>
        {group.isPrivate && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
            Privado
          </span>
        )}
      </div>
    </Link>
  );
}
