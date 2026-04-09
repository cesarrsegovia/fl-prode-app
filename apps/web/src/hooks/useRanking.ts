'use client';

import { useEffect, useState } from 'react';
import type { RankingEntry } from '@prode/shared';
import { api } from '@/lib/axios';

export function useRanking(groupId?: string) {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const endpoint = groupId
      ? `/api/ranking/grupo/${groupId}`
      : '/api/ranking/global';

    api
      .get(endpoint)
      .then((res) => setEntries(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [groupId]);

  return { entries, isLoading };
}
