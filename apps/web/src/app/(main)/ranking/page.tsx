'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import type { MyGroupEntry } from '@/lib/endpoints';
import { grupos } from '@/lib/endpoints';
import { useRanking } from '@/hooks/useRanking';
import { RankingTable } from '@/components/ranking/RankingTable';
import { PillTabs } from '@/components/ui/pill-tabs';

const PAGE_SIZE = 20;

export default function RankingPage() {
  const t = useTranslations('ranking');
  const { data: session } = useSession();
  const [myGroups, setMyGroups] = useState<MyGroupEntry[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('global');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!session) return;
    grupos.mine().then(setMyGroups).catch(() => setMyGroups([]));
  }, [session]);

  const { entries, isLoading, error } = useRanking(
    selectedGroup === 'global' ? undefined : selectedGroup,
  );

  const myUserId = (session?.user as { id?: string } | undefined)?.id;

  const tabs = [
    { value: 'global', label: t('global') },
    ...myGroups.map((m) => ({ value: m.group.id, label: m.group.name })),
  ];

  function handleGroupChange(value: string) {
    setSelectedGroup(value);
    setVisibleCount(PAGE_SIZE);
  }

  const visibleEntries = entries.slice(0, visibleCount);
  const hasMore = entries.length > visibleCount;

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
          {t('title')}
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {t('subtitle')}
        </p>
      </header>

      <PillTabs
        tabs={tabs}
        value={selectedGroup}
        onValueChange={handleGroupChange}
        aria-label={t('groupSelector')}
        className="mb-6"
      />

      {error ? (
        <div role="alert" className="rounded-xl p-4 bg-surface-1 text-destructive text-sm font-medium">
          {t('loadError')}
        </div>
      ) : (
        <>
          <RankingTable
            entries={visibleEntries}
            isLoading={isLoading}
            highlightUserId={myUserId}
          />
          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="bg-surface-1 hover:bg-surface-2 text-foreground rounded-full px-6 py-2 font-display font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon transition-colors"
              >
                {t('showMore')}
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
