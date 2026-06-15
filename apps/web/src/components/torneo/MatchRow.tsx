import Link from 'next/link';
import type { ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { MatchDto } from '@/lib/server-endpoints';
import { TeamFlag } from './TeamFlag';

function TeamCell({
  name,
  flagUrl,
  align,
  score,
  finished,
}: {
  name: string;
  flagUrl: string | null;
  align: 'left' | 'right';
  score?: number | null;
  finished: boolean;
}) {
  const showScore = finished && score !== null && score !== undefined;
  const scoreEl = showScore ? (
    <span className="font-display font-extrabold text-2xl text-neon tabular-nums shrink-0">
      {score}
    </span>
  ) : null;

  const flag = <TeamFlag size="md" src={flagUrl} alt={name} />;
  const label = (
    <span
      className={cn(
        'font-display font-semibold text-sm sm:text-base text-foreground truncate',
        align === 'right' && 'text-right',
      )}
    >
      {name}
    </span>
  );

  // Bandera del lado INTERNO (junto a la hora), nombre hacia afuera, espejado:
  // local = [score][nombre][bandera] alineado a la derecha;
  // visitante = [bandera][nombre][score] alineado a la izquierda.
  return (
    <div
      className={cn(
        'flex items-center gap-3 min-w-0 w-full',
        align === 'left' ? 'justify-end' : 'justify-start',
      )}
    >
      {align === 'left' ? (
        <>
          {scoreEl}
          {label}
          {flag}
        </>
      ) : (
        <>
          {flag}
          {label}
          {scoreEl}
        </>
      )}
    </div>
  );
}

interface Props {
  match: MatchDto;
  /** Si está presente, todo el row es clickeable. Default: `/partido/{id}`. Pasar `false` para no linkear. */
  href?: string | false;
  /** Muestra la columna de fecha también en mobile. Default: false. */
  showDate?: boolean;
  /** CTA opcional renderizado al final de la fila, dentro de la card. */
  action?: ReactNode;
}

export function MatchRow({ match, href, showDate = false, action }: Props) {
  const t = useTranslations('torneo');
  const format = useFormatter();
  const kickoff = new Date(match.startTime);
  const ts = {
    weekday: format.dateTime(kickoff, { weekday: 'short' }).replace('.', ''),
    day: format.dateTime(kickoff, { day: '2-digit' }),
    month: format.dateTime(kickoff, { month: 'short' }),
    time: format.dateTime(kickoff, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
  const live = match.status === 'LIVE';
  const finished = match.status === 'FINISHED';
  const cancelled = match.status === 'CANCELLED';
  const target = href === false ? null : (href ?? `/partido/${match.id}`);

  const classes = cn(
    'group block rounded-xl border bg-surface-1 transition-colors hover:bg-surface-2',
    live ? 'border-neon/60 ring-1 ring-neon/30' : 'border-line/60',
  );

  const content = (
    <>
      <div className="flex items-center gap-4 px-4 py-3">
        <div className={cn('flex-col items-center w-14 shrink-0 border-r border-line/40 pr-3', showDate ? 'flex' : 'hidden sm:flex')}>
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-dim font-display">
            {ts.weekday}
          </span>
          <span className="font-display font-extrabold text-xl text-foreground tabular-nums leading-none">
            {ts.day}
          </span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            {ts.month}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 flex-1 min-w-0">
          <TeamCell
            name={match.homeTeam?.name ?? match.homeTeamName}
            flagUrl={match.homeTeam?.flagUrl ?? null}
            align="left"
            score={match.homeScore}
            finished={finished}
          />

          <div className="flex flex-col items-center gap-1 px-2">
            {live ? (
              <Badge className="bg-neon text-primary-foreground gap-1.5">
                <span className="size-1.5 rounded-full bg-current animate-pulse" />
                {t('matchRow.live')}
              </Badge>
            ) : finished ? (
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-dim font-display">
                {t('matchRow.final')}
              </span>
            ) : cancelled ? (
              <Badge variant="secondary">{t('matchRow.cancelled')}</Badge>
            ) : (
              <span className="font-display font-bold text-lg text-foreground tabular-nums">
                {ts.time}
              </span>
            )}
          </div>

          <TeamCell
            name={match.awayTeam?.name ?? match.awayTeamName}
            flagUrl={match.awayTeam?.flagUrl ?? null}
            align="right"
            score={match.awayScore}
            finished={finished}
          />
        </div>

        {action && <div className="shrink-0">{action}</div>}
      </div>

      {match.venue && (
        <div className="px-4 pb-3 -mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-ink-dim font-display">
          {match.group && (
            <span className="text-neon">{t('common.group', { name: match.group.name })}</span>
          )}
          {match.group && <span>·</span>}
          <span className="truncate" title={`${match.venue.name} · ${match.venue.city}`}>
            {match.venue.name} · {match.venue.city}
          </span>
        </div>
      )}
    </>
  );

  if (target) {
    return (
      <Link href={target} className={classes}>
        {content}
      </Link>
    );
  }
  return <article className={classes}>{content}</article>;
}
