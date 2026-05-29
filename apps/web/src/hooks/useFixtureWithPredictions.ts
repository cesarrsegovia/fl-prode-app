'use client';

import { useEffect, useState } from 'react';
import type { FixtureWithMatches, Prediction } from '@prode/shared';
import { fixtures, pronosticos } from '@/lib/endpoints';

export interface UseFixtureWithPredictionsResult {
  fixture: FixtureWithMatches | null;
  predictions: Prediction[];
  isLoading: boolean;
  error: unknown;
}

/**
 * Carga una fecha (fixture) junto con las predicciones del usuario.
 * Un fallo al cargar predicciones degrada a lista vacía (no es error fatal);
 * un fallo al cargar el fixture sí se expone como error.
 */
export function useFixtureWithPredictions(
  fechaId: string,
): UseFixtureWithPredictionsResult {
  const [fixture, setFixture] = useState<FixtureWithMatches | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    Promise.all([
      fixtures.one(fechaId),
      pronosticos.byFixture(fechaId).catch(() => [] as Prediction[]),
    ])
      .then(([fx, ps]) => {
        if (cancelled) return;
        setFixture(fx);
        setPredictions(ps as Prediction[]);
      })
      .catch((e) => {
        if (!cancelled) setError(e);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fechaId]);

  return { fixture, predictions, isLoading, error };
}
