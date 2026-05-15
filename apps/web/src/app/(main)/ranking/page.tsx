'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import type { MyGroupEntry } from '@/lib/endpoints';
import { grupos } from '@/lib/endpoints';
import { useRanking } from '@/hooks/useRanking';
import { RankingTable } from '@/components/ranking/RankingTable';

export default function RankingPage() {
  const { data: session } = useSession();
  const [myGroups, setMyGroups] = useState<MyGroupEntry[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | 'global'>('global');

  useEffect(() => {
    if (!session) return;
    grupos.mine().then(setMyGroups).catch(() => setMyGroups([]));
  }, [session]);

  const { entries, isLoading } = useRanking(
    selectedGroup === 'global' ? undefined : selectedGroup,
  );

  const myUserId = (session?.user as { id?: string } | undefined)?.id;

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-white tracking-tight">
          Ranking
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Actualización en tiempo real al calcularse los puntos.
        </p>
      </header>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setSelectedGroup('global')}
          className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
            selectedGroup === 'global'
              ? 'bg-primary text-black'
              : 'bg-surface-container-low text-on-surface-variant'
          }`}
        >
          Global
        </button>
        {myGroups.map((m) => (
          <button
            key={m.group.id}
            onClick={() => setSelectedGroup(m.group.id)}
            className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${
              selectedGroup === m.group.id
                ? 'bg-primary text-black'
                : 'bg-surface-container-low text-on-surface-variant'
            }`}
          >
            {m.group.name}
          </button>
        ))}
      </div>

      <RankingTable
        entries={entries}
        isLoading={isLoading}
        highlightUserId={myUserId}
      />
    </main>
  );
}
