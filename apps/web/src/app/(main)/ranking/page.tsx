'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import type { MyGroupEntry } from '@/lib/endpoints';
import { grupos } from '@/lib/endpoints';
import { useRanking } from '@/hooks/useRanking';
import { RankingTable } from '@/components/ranking/RankingTable';
import { PillTabs } from '@/components/ui/pill-tabs';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

const PAGE_SIZE = 20;

type Scope = 'global' | 'friends';

export default function RankingPage() {
  const t = useTranslations('ranking');
  const { data: session } = useSession();
  const [myGroups, setMyGroups] = useState<MyGroupEntry[]>([]);
  const [scope, setScope] = useState<Scope>('global');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!session) return;
    grupos.mine().then(setMyGroups).catch(() => setMyGroups([]));
  }, [session]);

  // Mantiene un grupo seleccionado válido al cargar/cambiar la lista de grupos.
  useEffect(() => {
    if (myGroups.length === 0) {
      setSelectedGroupId(null);
      return;
    }
    setSelectedGroupId((prev) =>
      prev && myGroups.some((m) => m.group.id === prev) ? prev : myGroups[0].group.id,
    );
  }, [myGroups]);

  // En "Amigos" el ranking es el del grupo seleccionado; "Global" no envía grupo.
  const friendsGroupId =
    scope === 'friends' ? selectedGroupId ?? myGroups[0]?.group.id : undefined;
  const { entries, isLoading, error } = useRanking(friendsGroupId);

  const myUserId = (session?.user as { id?: string } | undefined)?.id;

  // Pestañas de alcance fijas y traducibles (no usan el nombre del grupo).
  const scopeTabs = useMemo(
    () => [
      { value: 'global' as Scope, label: t('global') },
      { value: 'friends' as Scope, label: t('friends') },
    ],
    [t],
  );

  // Selector secundario por grupo (solo si hay más de uno): aquí sí aparecen
  // los nombres reales de los grupos, que son contenido del usuario.
  const groupTabs = useMemo(
    () => myGroups.map((m) => ({ value: m.group.id, label: m.group.name })),
    [myGroups],
  );

  function handleScopeChange(value: Scope) {
    setScope(value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleGroupChange(value: string) {
    setSelectedGroupId(value);
    setVisibleCount(PAGE_SIZE);
  }

  const showNoGroups = scope === 'friends' && myGroups.length === 0;
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
        tabs={scopeTabs}
        value={scope}
        onValueChange={handleScopeChange}
        aria-label={t('scopeSelector')}
        className="mb-4"
      />

      {scope === 'friends' && groupTabs.length > 1 && (
        <PillTabs
          tabs={groupTabs}
          value={selectedGroupId ?? groupTabs[0].value}
          onValueChange={handleGroupChange}
          aria-label={t('groupSelector')}
          className="mb-6"
        />
      )}

      {showNoGroups ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t('noGroupsTitle')}</EmptyTitle>
            <EmptyDescription>{t('noGroupsDesc')}</EmptyDescription>
          </EmptyHeader>
          <Link href="/grupos" className="text-neon font-display font-bold text-sm hover:underline">
            {t('goToGroups')}
          </Link>
        </Empty>
      ) : error ? (
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
