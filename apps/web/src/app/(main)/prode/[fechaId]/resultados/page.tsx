'use client';

import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { FixtureWithMatches, Match, Prediction } from '@prode/shared';
import { MatchStatus, Result } from '@prode/shared';
import { fixtures, pronosticos } from '@/lib/endpoints';

function resultFrom(match: Match): Result | null {
  if (match.homeScore === null || match.awayScore === null) return null;
  if (match.homeScore > match.awayScore) return Result.HOME;
  if (match.homeScore < match.awayScore) return Result.AWAY;
  return Result.DRAW;
}

const RESULT_LABEL: Record<Result, string> = {
  [Result.HOME]: 'Local',
  [Result.DRAW]: 'Empate',
  [Result.AWAY]: 'Visitante',
};

export default function ResultadosPage({
  params,
}: {
  params: Promise<{ fechaId: string }>;
}) {
  const { fechaId } = use(params);
  const [fixture, setFixture] = useState<FixtureWithMatches | null>(null);
  const [preds, setPreds] = useState<Prediction[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fixtures.one(fechaId),
      pronosticos.byFixture(fechaId).catch(() => []),
    ])
      .then(([fx, ps]) => {
        setFixture(fx);
        setPreds(ps as Prediction[]);
      })
      .catch((e) => setError(e?.message ?? 'No se pudo cargar la fecha'));
  }, [fechaId]);

  const totalPoints = useMemo(
    () => preds.reduce((acc, p) => acc + (p.pointsEarned ?? 0), 0),
    [preds],
  );

  if (error) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <p className="text-sm text-red-400 font-bold">{error}</p>
      </main>
    );
  }

  if (!fixture) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <div
          className="h-64 rounded-2xl animate-pulse"
          style={{ background: 'var(--surface-container-low)' }}
        />
      </main>
    );
  }

  const predByMatch = new Map(preds.map((p) => [p.matchId, p]));

  return (
    <main className="pt-24 pb-24 px-4 max-w-3xl mx-auto">
      <Link
        href={`/prode/${fixture.id}`}
        className="text-xs font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest"
      >
        ← Volver a pronósticos
      </Link>

      <header className="mt-2 mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white">
            Resultados — Fecha {fixture.round}
          </h1>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-on-surface-variant font-bold">
            Tus puntos
          </p>
          <p className="text-3xl font-black text-primary">{totalPoints}</p>
        </div>
      </header>

      <ul className="space-y-3">
        {fixture.matches.map((match) => {
          const realResult = resultFrom(match);
          const pred = predByMatch.get(match.id);
          const finished = match.status === MatchStatus.FINISHED;
          const hit = pred && realResult && pred.result === realResult;
          const exact =
            hit &&
            pred.homeScoreGuess === match.homeScore &&
            pred.awayScoreGuess === match.awayScore;

          return (
            <li
              key={match.id}
              className="rounded-xl p-4"
              style={{ background: 'var(--surface-container-low)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-white">
                  {match.homeTeam} vs {match.awayTeam}
                </p>
                <span className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                  {finished
                    ? `${match.homeScore} - ${match.awayScore}`
                    : 'Pendiente'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <p className="text-on-surface-variant uppercase tracking-widest font-bold">
                    Resultado real
                  </p>
                  <p className="text-white font-bold">
                    {realResult ? RESULT_LABEL[realResult] : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-on-surface-variant uppercase tracking-widest font-bold">
                    Tu pronóstico
                  </p>
                  <p className="text-white font-bold">
                    {pred ? RESULT_LABEL[pred.result] : 'Sin cargar'}
                    {pred?.isCaptain && (
                      <span className="ml-2 text-primary">(C)</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-on-surface-variant uppercase tracking-widest font-bold">
                    Puntos
                  </p>
                  <p
                    className={`font-black text-lg ${
                      (pred?.pointsEarned ?? 0) > 0
                        ? 'text-primary'
                        : 'text-white'
                    }`}
                  >
                    {pred?.pointsEarned ?? '—'}
                  </p>
                </div>
              </div>

              {finished && pred && (
                <div className="mt-2 flex gap-2 text-[10px] font-bold uppercase tracking-widest">
                  {hit && (
                    <span className="text-primary">+3 Resultado</span>
                  )}
                  {exact && <span className="text-primary">+3 Exacto</span>}
                  {pred.isCaptain && (pred.pointsEarned ?? 0) > 0 && (
                    <span className="text-primary">x2 Capitán</span>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
