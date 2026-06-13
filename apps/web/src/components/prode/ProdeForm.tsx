'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FixtureWithMatches, Prediction, Result } from '@prode/shared';
import {
  isKnockoutStage,
  matchPredictionDeadline,
} from '@prode/shared';
import { pronosticos } from '@/lib/endpoints';
import { normalizeSavedScore } from '@/lib/match-pick';
import { eligibleCaptainMatches, isCaptainLocked } from '@/lib/captain';
import { MatchCard, type MatchPick } from './MatchCard';
import { Countdown } from './Countdown';
import { PercentBar } from '@/components/ui/percent-bar';
import { Loader2, ArrowLeft, Check } from 'lucide-react';
import Link from 'next/link';

interface Props {
  fixture: FixtureWithMatches;
  initialPredictions?: Prediction[];
}

type PickMap = Record<string, MatchPick>;

function buildInitialPicks(preds?: Prediction[]): PickMap {
  if (!preds?.length) return {};
  return preds.reduce<PickMap>((acc, p) => {
    // Normaliza picks viejos con medio marcador (un lado null → 0). Si el
    // partido sigue abierto y el usuario re-guarda, el marcador completo se
    // persiste y queda corregido para el scoring.
    const { home, away } = normalizeSavedScore(
      p.homeScoreGuess,
      p.awayScoreGuess,
    );
    acc[p.matchId] = {
      result: p.result,
      homeScoreGuess: home,
      awayScoreGuess: away,
      isCaptain: p.isCaptain,
    };
    return acc;
  }, {});
}

/** Firma estable de un pick para comparar lo cargado contra lo guardado. */
function pickSignature(p?: MatchPick): string {
  if (!p?.result) return '';
  return `${p.result}|${p.homeScoreGuess ?? ''}|${p.awayScoreGuess ?? ''}|${p.isCaptain ? '1' : '0'}`;
}

export function ProdeForm({ fixture, initialPredictions }: Props) {
  const t = useTranslations('prode.form');
  const [picks, setPicks] = useState<PickMap>(() =>
    buildInitialPicks(initialPredictions),
  );
  // Snapshot de lo que ya está persistido en el servidor, para detectar
  // si quedan cambios sin guardar.
  const [savedPicks, setSavedPicks] = useState<PickMap>(() =>
    buildInitialPicks(initialPredictions),
  );
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [isSavingAll, setIsSavingAll] = useState(false);
  // matchIds que se acaban de guardar; muestran "Guardado" en verde por un rato.
  const [justSavedIds, setJustSavedIds] = useState<Set<string>>(new Set());

  const flashSaved = (matchIds: string[]) => {
    setJustSavedIds((prev) => {
      const next = new Set(prev);
      matchIds.forEach((id) => next.add(id));
      return next;
    });
    setTimeout(() => {
      setJustSavedIds((prev) => {
        const next = new Set(prev);
        matchIds.forEach((id) => next.delete(id));
        return next;
      });
    }, 2000);
  };
  const [captainId, setCaptainId] = useState<string | null>(
    () =>
      initialPredictions?.find((p) => p.isCaptain)?.matchId ?? null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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
  // Cada partido cierra 1h antes de su inicio (grupos y eliminatorias). El
  // contador del encabezado apunta al próximo partido que todavía esté abierto.
  const nextOpenDeadline = useMemo(() => {
    const futures = fixture.matches
      .map((m) => deadlinesByMatch[m.id])
      .filter((d): d is Date => !!d && d.getTime() > now)
      .sort((a, b) => a.getTime() - b.getTime());
    return futures[0] ?? null;
  }, [fixture.matches, deadlinesByMatch, now]);
  const allClosed = fixture.matches.every((m) => isMatchClosed(m.id));

  // El capitán queda bloqueado una vez confirmado (guardado). Solo partidos
  // abiertos son elegibles.
  const captainLocked = useMemo(
    () => isCaptainLocked(Object.values(savedPicks)),
    [savedPicks],
  );
  const captainMatch = useMemo(() => {
    const lockedId = Object.entries(savedPicks).find(
      ([, p]) => p.isCaptain,
    )?.[0];
    return lockedId
      ? fixture.matches.find((m) => m.id === lockedId) ?? null
      : null;
  }, [savedPicks, fixture.matches]);
  const captainOptions = useMemo(
    () => eligibleCaptainMatches(fixture.matches, isMatchClosed),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fixture.matches, now],
  );

  const totalMatches = fixture.matches.length;
  const filledCount = useMemo(
    () =>
      Object.values(picks).filter((p) => p.result !== undefined).length,
    [picks],
  );

  // Hay cambios sin guardar si algún partido ABIERTO tiene un pick con
  // resultado que difiere de lo ya persistido.
  const hasPendingChanges = useMemo(
    () =>
      fixture.matches.some((m) => {
        if (isMatchClosed(m.id)) return false;
        const p = picks[m.id];
        if (!p?.result) return false;
        return pickSignature(p) !== pickSignature(savedPicks[m.id]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fixture.matches, picks, savedPicks, now],
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
      setSavedPicks((prev) => ({ ...prev, [matchId]: { ...pick } }));
      flashSaved([matchId]);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ?? t('saveError'),
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
      setSubmitError(t('needOne'));
      return;
    }
    setIsSavingAll(true);
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
      setSavedPicks((prev) => {
        const next = { ...prev };
        for (const [matchId, pick] of entries) next[matchId] = { ...pick };
        return next;
      });
      flashSaved(entries.map(([matchId]) => matchId));
      setSuccessMsg(t('savedMany', { count: entries.length }));
      setTimeout(() => setSuccessMsg(null), 2000);
    } catch (err: any) {
      setSubmitError(
        err?.response?.data?.message ?? t('saveAllError'),
      );
    } finally {
      setIsSavingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-4 flex items-center justify-between gap-4 bg-surface-1">
        <div>
          <p className="text-xs uppercase tracking-widest text-ink-muted font-bold">
            {t('nextClose')}
          </p>
          {nextOpenDeadline ? (
            <Countdown targetDate={nextOpenDeadline} />
          ) : (
            <p className="text-sm font-bold text-ink-muted">{t('closed')}</p>
          )}
        </div>
        <div className="text-right min-w-0">
          <p className="text-xs uppercase tracking-widest text-ink-muted font-bold">
            {t('progress')}
          </p>
          <p className="text-sm font-bold text-foreground">
            {t('progressValue', { filled: filledCount, total: totalMatches })}
          </p>
          <PercentBar
            value={filledCount}
            max={totalMatches}
            tone="neon"
            label={t('progressValue', { filled: filledCount, total: totalMatches })}
            className="mt-1 w-32 sm:w-40 ml-auto"
          />
        </div>
      </div>

      {!allClosed && !isKnockoutFixture && (
        <div className="rounded-xl p-4 flex items-center justify-between gap-4 bg-surface-1">
          <div>
            <p
              id="captain-label"
              className="text-xs uppercase tracking-widest text-ink-muted font-bold"
            >
              {t('captainTitle')}
            </p>
            <p className="text-sm font-bold text-foreground">{t('captainDesc')}</p>
          </div>
          {captainLocked ? (
            <div className="flex items-center gap-2 bg-surface-2 rounded-lg py-2 px-3">
              <span className="text-sm font-bold text-neon">
                {captainMatch
                  ? `${captainMatch.homeTeamName} vs ${captainMatch.awayTeamName}`
                  : t('captainConfirmed')}
              </span>
              <span className="text-[10px] uppercase tracking-widest font-bold text-ink-dim">
                {t('captainLocked')}
              </span>
            </div>
          ) : (
            <select
              aria-labelledby="captain-label"
              className="bg-surface-2 text-foreground text-sm rounded-lg py-2 px-3 font-medium focus-visible:ring-2 focus-visible:ring-neon focus-visible:outline-none"
              value={captainId ?? ''}
              onChange={(e) => setCaptainId(e.target.value || null)}
            >
              <option value="">{t('noCaptain')}</option>
              {captainOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeamName} vs {m.awayTeamName}
                </option>
              ))}
            </select>
          )}
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
                  {justSavedIds.has(match.id) ? (
                    <span
                      aria-live="polite"
                      className="flex items-center gap-1 text-xs font-bold text-success"
                    >
                      <Check className="size-3.5" />
                      {t('savedThis')}
                    </span>
                  ) : pickSignature(picks[match.id]) ===
                    pickSignature(savedPicks[match.id]) ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-ink-dim">
                      <Check className="size-3.5" />
                      {t('savedThis')}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => savePick(match.id)}
                      disabled={savingMatchId === match.id}
                      className="text-xs font-bold text-neon hover:underline disabled:opacity-50"
                    >
                      {savingMatchId === match.id ? t('saving') : t('saveThis')}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {submitError && (
        <p role="alert" className="text-sm font-bold text-destructive">
          {submitError}
        </p>
      )}
      {successMsg && (
        <p aria-live="polite" className="text-sm font-bold text-neon">
          {successMsg}
        </p>
      )}

      {!allClosed && hasPendingChanges ? (
        <button
          type="button"
          onClick={saveAll}
          disabled={isSavingAll}
          className="w-full h-14 bg-neon text-primary-foreground font-extrabold text-lg rounded-xl active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSavingAll ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              {t('saving')}
            </>
          ) : (
            t('saveAll')
          )}
        </button>
      ) : (
        <Link
          href="/prode"
          className="w-full h-14 bg-surface-2 text-foreground font-extrabold text-lg rounded-xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2 hover:bg-surface-1"
        >
          <ArrowLeft className="size-5" />
          {t('back')}
        </Link>
      )}
    </div>
  );
}
