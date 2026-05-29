// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('@/lib/endpoints', () => ({
  fixtures: { one: vi.fn() },
  pronosticos: { byFixture: vi.fn() },
}));

import { fixtures, pronosticos } from '@/lib/endpoints';
import { useFixtureWithPredictions } from './useFixtureWithPredictions';

const fx = { id: 'f1', round: 1, matches: [], closeAt: '2026-06-01T00:00:00Z' };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useFixtureWithPredictions', () => {
  it('carga fixture y predicciones', async () => {
    (fixtures.one as ReturnType<typeof vi.fn>).mockResolvedValue(fx);
    (pronosticos.byFixture as ReturnType<typeof vi.fn>).mockResolvedValue([{ matchId: 'm1' }]);

    const { result } = renderHook(() => useFixtureWithPredictions('f1'));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fixture).toEqual(fx);
    expect(result.current.predictions).toEqual([{ matchId: 'm1' }]);
    expect(result.current.error).toBeNull();
  });

  it('tolera fallo de predicciones devolviendo lista vacía', async () => {
    (fixtures.one as ReturnType<typeof vi.fn>).mockResolvedValue(fx);
    (pronosticos.byFixture as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('no preds'));

    const { result } = renderHook(() => useFixtureWithPredictions('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fixture).toEqual(fx);
    expect(result.current.predictions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('expone error si falla el fixture', async () => {
    (fixtures.one as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    (pronosticos.byFixture as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { result } = renderHook(() => useFixtureWithPredictions('f1'));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fixture).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
