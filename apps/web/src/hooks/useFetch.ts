'use client';

import { useCallback, useEffect, useState } from 'react';

export interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Hook genérico de carga. `fetcher` debe ser estable (envolverlo en
 * useCallback en el consumidor si depende de props/estado).
 */
export function useFetch<T>(fetcher: () => Promise<T>): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetcher()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher]);

  const [reloadToken, setReloadToken] = useState(0);
  const refetch = useCallback(() => setReloadToken((n) => n + 1), []);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load, reloadToken]);

  return { data, isLoading, error, refetch };
}
