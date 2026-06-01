import { useFormatter, useTranslations } from 'next-intl';
import type { TournamentDto } from '@/lib/server-endpoints';

function daysUntil(date: string | null) {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

interface Props {
  tournament: TournamentDto;
}

export function TournamentHero({ tournament }: Props) {
  const t = useTranslations('torneo');
  const format = useFormatter();
  const dates =
    tournament.startDate && tournament.endDate
      ? format.dateTimeRange(
          new Date(tournament.startDate),
          new Date(tournament.endDate),
          { day: 'numeric', month: 'short' },
        )
      : null;
  const days = daysUntil(tournament.startDate);
  const upcoming = days !== null && days > 0;
  const year = tournament.endDate
    ? new Date(tournament.endDate).getFullYear()
    : null;

  return (
    <section className="relative pt-28 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-display text-xs uppercase tracking-[0.3em] text-neon mb-3">
              {tournament.type === 'INTERNATIONAL'
                ? t('type.international')
                : tournament.type === 'CUP'
                  ? t('type.cup')
                  : t('type.league')}
              {tournament.country && ` · ${tournament.country}`}
            </p>
            <h1 className="font-display font-extrabold tracking-[-0.04em] leading-[0.92] text-foreground text-[clamp(2.25rem,9vw,7rem)] wrap-break-word hyphens-auto">
              {tournament.name.replace(/\s*\d{4}\s*$/, '')}
              {year && (
                <span className="block text-neon-glow text-[0.85em]">
                  {year}
                </span>
              )}
            </h1>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            {dates && (
              <p className="font-display text-xl text-ink-muted tabular-nums">
                {dates}
              </p>
            )}
            {upcoming && (
              <div className="flex items-baseline gap-3 px-5 py-3 rounded-xl bg-surface-1 border border-line">
                <span className="font-display font-extrabold text-4xl text-neon tabular-nums">
                  {days}
                </span>
                <span className="font-display text-xs uppercase tracking-[0.2em] text-ink-muted">
                  {t('hero.days', { count: days })}<br />{t('hero.untilStart')}
                </span>
              </div>
            )}
            <div className="flex gap-4 text-xs uppercase tracking-[0.2em] text-ink-dim font-display">
              {tournament._count?.teams ? (
                <span>
                  <strong className="text-foreground tabular-nums">
                    {tournament._count.teams}
                  </strong>{' '}
                  {t('hero.teams')}
                </span>
              ) : null}
              {tournament._count?.matches ? (
                <span>
                  <strong className="text-foreground tabular-nums">
                    {tournament._count.matches}
                  </strong>{' '}
                  {t('hero.matches')}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
