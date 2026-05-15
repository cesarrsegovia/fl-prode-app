'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import type { FixtureWithMatches, RankingEntry } from '@prode/shared';
import {
  fixtures,
  grupos,
  notificaciones,
  ranking,
  type MyGroupEntry,
  type NotificationDto,
} from '@/lib/endpoints';
import { Countdown } from '@/components/prode/Countdown';
import { GroupCard } from '@/components/grupos/GroupCard';
import { PositionBadge } from '@/components/ranking/PositionBadge';

export default function HomePage() {
  const { data: session } = useSession();
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const username = session?.user?.name ?? session?.user?.email ?? 'Jugador';

  const [nextFixture, setNextFixture] = useState<FixtureWithMatches | null>(null);
  const [myGroups, setMyGroups] = useState<MyGroupEntry[]>([]);
  const [topRanking, setTopRanking] = useState<RankingEntry[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<NotificationDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fixtures.active().catch(() => []),
      grupos.mine().catch(() => []),
      ranking.global().catch(() => []),
      notificaciones.list().catch(() => []),
    ])
      .then(([fx, gs, rk, nt]) => {
        setNextFixture(fx[0] ?? null);
        setMyGroups(gs);
        setTopRanking(rk.slice(0, 5));
        setRecentNotifs(nt.slice(0, 5));
      })
      .finally(() => setIsLoading(false));
  }, []);

  const myRankPos = topRanking.find((e) => e.userId === userId)?.position;
  const myRankTotal = topRanking.find((e) => e.userId === userId)?.total;

  return (
    <main className="pt-24 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
          Hola, {username}
        </p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mt-1">
          Tu Prode
        </h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próxima fecha */}
        <section
          className="lg:col-span-2 rounded-2xl p-8 relative overflow-hidden"
          style={{
            background:
              'linear-gradient(135deg, var(--surface-container-low) 0%, var(--surface) 100%)',
          }}
        >
          {isLoading ? (
            <div className="h-32 animate-pulse" />
          ) : nextFixture ? (
            <>
              <p className="text-xs uppercase tracking-widest font-bold text-primary">
                Próxima fecha
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white mt-1">
                Fecha {nextFixture.round}
              </h2>
              <p className="text-sm text-on-surface-variant mt-1">
                {nextFixture.matches.length} partidos
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className="text-on-surface-variant">Cierra en</span>
                <Countdown targetDate={new Date(nextFixture.closeAt)} />
              </div>
              <Link
                href={`/prode/${nextFixture.id}`}
                className="inline-block mt-6 bg-primary text-black font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform"
              >
                Cargar pronósticos
              </Link>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
                Sin fechas abiertas
              </p>
              <h2 className="text-2xl font-bold text-white mt-1">
                No hay fechas para pronosticar por ahora.
              </h2>
              <p className="text-sm text-on-surface-variant mt-2">
                Volvé pronto, las próximas fechas aparecerán acá.
              </p>
            </>
          )}
        </section>

        {/* Mi ranking */}
        <section
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant">
            Mi ranking global
          </p>
          {isLoading ? (
            <div className="h-24 animate-pulse" />
          ) : myRankPos ? (
            <>
              <p className="text-5xl font-black text-white mt-2">
                #{myRankPos}
              </p>
              <p className="text-sm text-on-surface-variant mt-2">
                <span className="font-bold text-white">{myRankTotal}</span> puntos totales
              </p>
              <Link
                href="/ranking"
                className="inline-block mt-4 text-sm font-bold text-primary hover:underline"
              >
                Ver ranking completo →
              </Link>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-white mt-2">Sin ranking</p>
              <p className="text-sm text-on-surface-variant mt-2">
                Pronosticá una fecha para entrar al ranking.
              </p>
            </>
          )}
        </section>
      </div>

      {/* Mis grupos */}
      <section className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Mis grupos</h2>
          <Link
            href="/grupos"
            className="text-sm font-bold text-primary hover:underline"
          >
            Ver todos →
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-32 rounded-2xl animate-pulse"
                style={{ background: 'var(--surface-container-low)' }}
              />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <p className="text-sm text-on-surface-variant">
              Todavía no estás en ningún grupo.
            </p>
            <Link
              href="/grupos"
              className="inline-block mt-3 text-sm font-bold text-primary hover:underline"
            >
              Crear o unirme a uno →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {myGroups.slice(0, 3).map((entry) => (
              <GroupCard key={entry.group.id} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-10">
        {/* Top ranking */}
        <section
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <h2 className="text-lg font-bold text-white mb-4">Top 5 global</h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg animate-pulse"
                  style={{ background: 'var(--surface)' }}
                />
              ))}
            </div>
          ) : topRanking.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Todavía no hay datos en el ranking.
            </p>
          ) : (
            <ul className="space-y-2">
              {topRanking.map((e) => (
                <li
                  key={e.userId}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--surface)' }}
                >
                  <PositionBadge position={e.position} />
                  <span className="flex-1 font-bold text-white truncate">
                    {e.username}
                  </span>
                  <span className="text-sm font-black text-primary">
                    {e.total} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Actividad reciente */}
        <section
          className="rounded-2xl p-6"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <h2 className="text-lg font-bold text-white mb-4">
            Actividad reciente
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg animate-pulse"
                  style={{ background: 'var(--surface)' }}
                />
              ))}
            </div>
          ) : recentNotifs.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Sin novedades por ahora.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentNotifs.map((n) => (
                <li
                  key={n.id}
                  className="flex items-start gap-3 p-3 rounded-lg"
                  style={{ background: 'var(--surface)' }}
                >
                  <span className="w-2 h-2 rounded-full bg-primary mt-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white">{n.message}</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mt-1">
                      {new Date(n.createdAt).toLocaleString('es-AR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
