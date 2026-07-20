'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Trophy, ChevronRight } from 'lucide-react';
import type { RankingEntry } from '@prode/shared';
import { PositionBadge } from '@/components/ranking/PositionBadge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { displayName } from '@/lib/display-name';
import { getInitials } from '@/lib/avatar';

interface Props {
  tournamentId: string;
  top3: RankingEntry[];
  championTeam: { id: string; name: string; flagUrl: string | null } | null;
  topScorerWinner: { id: string; name: string; photoUrl: string | null } | null;
}

/**
 * Card de celebración que se muestra en el home cuando el torneo finalizó.
 * Reemplaza a "Partidos de hoy": muestra el podio (top 3 del ranking), el
 * equipo campeón y el goleador ganador.
 */
export function TournamentFinishedCard({
  tournamentId,
  top3,
  championTeam,
  topScorerWinner,
}: Props) {
  const t = useTranslations('home');

  return (
    <section className="mb-12 relative overflow-hidden rounded-2xl border border-neon/30 bg-gradient-to-br from-surface-1 via-surface-1 to-surface-2 p-8">
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0, transparent 40px, oklch(45% 0.13 150 / 0.4) 40px, oklch(45% 0.13 150 / 0.4) 41px)',
        }}
      />
      <div className="relative">
        {/* Encabezado */}
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="size-4 text-neon" />
          <span className="font-display text-xs uppercase tracking-[0.3em] text-neon">
            {t('finished.eyebrow')}
          </span>
        </div>
        <h2 className="font-display font-extrabold text-foreground text-[clamp(1.75rem,4vw,3rem)] tracking-[-0.03em] leading-[0.95]">
          {t('finished.title')}
        </h2>
        <p className="font-display text-sm text-ink-muted mt-2">
          {t('finished.congrats')}
        </p>

        {/* Podio */}
        {top3.length > 0 && (
          <div className="mt-8">
            <p className="font-display text-xs uppercase tracking-[0.25em] text-neon mb-4">
              {t('finished.podium')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {top3.map((entry) => {
                const name = displayName(entry.username, entry.userId);
                return (
                  <div
                    key={entry.userId}
                    className="flex flex-col items-center gap-3 p-5 rounded-xl bg-surface-2 border border-line text-center"
                  >
                    <PositionBadge position={entry.position} />
                    <UserAvatar
                      name={name}
                      image={entry.avatarUrl ?? null}
                      size="lg"
                    />
                    <p className="font-display font-bold text-foreground truncate max-w-full">
                      {name}
                    </p>
                    <p className="font-display font-extrabold text-neon tabular-nums">
                      {t('finished.points', { points: entry.total })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Campeón + Goleador */}
        {(championTeam || topScorerWinner) && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {championTeam && (
              <div className="flex items-center gap-4 p-5 rounded-xl bg-surface-2 border border-line">
                <TeamFlag size="lg" src={championTeam.flagUrl} alt={championTeam.name} />
                <div className="min-w-0">
                  <p className="font-display text-xs uppercase tracking-[0.25em] text-neon">
                    {t('finished.champion')}
                  </p>
                  <p className="font-display font-extrabold text-lg text-foreground truncate">
                    {championTeam.name}
                  </p>
                </div>
              </div>
            )}

            {topScorerWinner && (
              <div className="flex items-center gap-4 p-5 rounded-xl bg-surface-2 border border-line">
                <Avatar size="lg" className="shrink-0">
                  <AvatarImage
                    src={topScorerWinner.photoUrl ?? undefined}
                    alt={topScorerWinner.name}
                    className="object-cover"
                  />
                  <AvatarFallback className="bg-surface-3 text-foreground text-sm font-bold">
                    {getInitials(topScorerWinner.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-display text-xs uppercase tracking-[0.25em] text-neon">
                    {t('finished.topScorer')}
                  </p>
                  <p className="font-display font-extrabold text-lg text-foreground truncate">
                    {topScorerWinner.name}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Acceso al detalle del torneo (reemplaza el CTA del hero oculto). */}
        <div className="mt-6">
          <Link
            href={`/torneo/${tournamentId}`}
            className="inline-flex items-center gap-1 text-xs font-display font-bold text-foreground hover:text-neon transition-colors"
          >
            {t('tournament.view')}
            <ChevronRight className="size-3" />
          </Link>
        </div>
      </div>
    </section>
  );
}
