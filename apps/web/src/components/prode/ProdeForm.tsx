'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FixtureWithMatches, Prediction, Result } from '@prode/shared';
import {
  isKnockoutStage,
  matchPredictionDeadline,
} from '@prode/shared';
import { pronosticos } from '@/lib/endpoints';
import { MatchCard, type MatchPick } from './MatchCard';
import { Countdown } from './Countdown';

interface Props {
  fixture: FixtureWithMatches;
  initialPredictions?: Prediction[];
}

type PickMap = Record<string, MatchPick>;

function buildInitialPicks(preds?: Prediction[]): PickMap {
  if (!preds?.length) return {};
  return preds.reduce<PickMap>((acc, p) => {
    acc[p.matchId] = {
      result: p.result,
      homeScoreGuess: p.homeScoreGuess ?? undefined,
      awayScoreGuess: p.awayScoreGuess ?? undefined,
      isCaptain: p.isCaptain,
    };
    return acc;
  }, {});
}

export function ProdeForm({ fixture, initialPredictions }: Props) {
  const [picks, setPicks] = useState<PickMap>(() =>
    buildInitialPicks(initialPredictions),
  );
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [captainId, setCaptainId] = useState<string | null>(
    () =>
      initialPredictions?.find((p) => p.isCaptain)?.matchId ?? null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fixtureCloseAt = useMemo(
    () => new Date(fixture.closeAt),
    [fixture.closeAt],
  );
  const isKnockoutFixture = useMemo(
    () =>
      fixture.matches.length > 0 && isKnockoutStage(fixture.matches[0].stage),
    [fixture.matches],
  );
  const deadlinesByMatch = useMemo(() => {
    const map: Record<string, Date> = {};
    for (const m of fixture.matches) {
      map[m.id] = matchPredictionDeadline({
        stage: m.stage,
        startTime: m.startTime,
        fixtureCloseAt: fixture.closeAt,
      });
    }
    return map;
  }, [fixture.matches, fixture.closeAt]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const isMatchClosed = (matchId: string) =>
    (deadlinesByMatch[matchId]?.getTime() ?? 0) <= now;
  const nextOpenDeadline = useMemo(() => {
    if (!isKnockoutFixture) return fixtureCloseAt;
    const futures = fixture.matches
      .map((m) => deadlinesByMatch[m.id])
      .filter((d): d is Date => !!d && d.getTime() > now)
      .sort((a, b) => a.getTime() - b.getTime());
    return futures[0] ?? null;
  }, [isKnockoutFixture, fixture.matches, deadlinesByMatch, fixtureCloseAt, now]);
  const allClosed = fixture.matches.every((m) => isMatchClosed(m.id));

  const totalMatches = fixture.matches.length;
  const filledCount = useMemo(
    () =>
      Object.values(picks).filter((p) => p.result !== undefined).length,
    [picks],
  );

  useEffect(() => {
    if (captainId) {
      setPicks((prev) => {
        const next: PickMap = {};
        for (const [matchId, p] of Object.entries(prev)) {
          next[matchId] = { ...p, isCaptain: matchId === captainId };
        }
        return next;
      });
    }
  }, [captainId]);

  const updatePick = (matchId: string, next: MatchPick) => {
    setPicks((prev) => ({ ...prev, [matchId]: next }));
    if (next.isCaptain) setCaptainId(matchId);
    else if (captainId === matchId && next.isCaptain === false)
      setCaptainId(null);
  };

  const savePick = async (matchId: string) => {
    const pick = picks[matchId];
    if (!pick?.result) return;
    setSavingMatchId(matchId);
    setSubmitError(null);
    try {
      await pronosticos.upsert({
        matchId,
        fixtureId: fixture.id,
        result: pick.result,
        homeScoreGuess: pick.homeScoreGuess,
        awayScoreGuess: pick.awayScoreGuess,
        isCaptain: pick.isCaptain,
      });
      setSuccessMsg('Pronóstico guardado');
      setTimeout(() => setSuccessMsg(null), 1500);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ?? 'No se pudo guardar el pronóstico',
      );
    } finally {
      setSavingMatchId(null);
    }
  };

  const saveAll = async () => {
    setSubmitError(null);
    const entries = Object.entries(picks).filter(
      ([matchId, p]) => p.result && !isMatchClosed(matchId),
    );
    if (!entries.length) {
      setSubmitError('Marcá al menos un resultado antes de guardar.');
      return;
    }
    try {
      for (const [matchId, pick] of entries) {
        await pronosticos.upsert({
          matchId,
          fixtureId: fixture.id,
          result: pick.result as Result,
          homeScoreGuess: pick.homeScoreGuess,
          awayScoreGuess: pick.awayScoreGuess,
          isCaptain: pick.isCaptain,
        });
      }
      setSuccessMsg(`${entries.length} pronósticos guardados`);
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ?? 'Hubo un problema al guardar',
      );
    }
  };

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl p-4 flex items-center justify-between"
        style={{ background: 'var(--surface-container-low)' }}
      >
        <div>
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
            {isKnockoutFixture ? 'Próximo cierre' : 'Cierra en'}
          </p>
          {nextOpenDeadline ? (
            <Countdown targetDate={nextOpenDeadline} />
          ) : (
            <p className="text-sm font-bold text-on-surface-variant">
              Pronósticos cerrados
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
            Progreso
          </p>
          <p className="text-sm font-bold text-white">
            {filledCount} de {totalMatches} partidos
          </p>
          <div className="w-40 bg-surface-container-highest rounded-full h-1.5 mt-1">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{
                width: `${totalMatches ? (filledCount / totalMatches) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {!allClosed && !isKnockoutFixture && (
        <div
          className="rounded-xl p-4 flex items-center justify-between gap-4"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <div>
            <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
              Capitán de la fecha
            </p>
            <p className="text-sm font-bold text-white">
              Dobla los puntos del partido elegido
            </p>
          </div>
          <select
            className="bg-surface-container-highest text-white text-sm rounded-lg py-2 px-3 font-medium"
            value={captainId ?? ''}
            onChange={(e) => setCaptainId(e.target.value || null)}
          >
            <option value="">Sin capitán</option>
            {fixture.matches.map((m) => (
              <option key={m.id} value={m.id}>
                {m.homeTeamName} vs {m.awayTeamName}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-4">
        {fixture.matches.map((match) => {
          const closed = isMatchClosed(match.id);
          return (
            <div key={match.id}>
              <MatchCard
                match={match}
                pick={picks[match.id]}
                isCaptainOption={false}
                disabled={closed}
                onChange={(next) => updatePick(match.id, next)}
              />
              {!closed && picks[match.id]?.result && (
                <div className="mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => savePick(match.id)}
                    disabled={savingMatchId === match.id}
                    className="text-xs font-bold text-primary hover:underline disabled:opacity-50"
                  >
                    {savingMatchId === match.id
                      ? 'Guardando…'
                      : 'Guardar este'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {submitError && (
        <p className="text-sm font-bold text-red-400">{submitError}</p>
      )}
      {successMsg && (
        <p className="text-sm font-bold text-primary">{successMsg}</p>
      )}

      {!allClosed && (
        <button
          type="button"
          onClick={saveAll}
          className="w-full h-14 bg-primary text-black font-extrabold text-lg rounded-xl active:scale-[0.98] transition-transform"
        >
          Guardar todos los pronósticos
        </button>
      )}
    </div>
  );
}
