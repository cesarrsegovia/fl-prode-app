import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { MatchDto } from '@/lib/server-endpoints';
import { TeamFlag } from './TeamFlag';

function formatKickoff(iso: string) {
  const d = new Date(iso);
  return {
    weekday: new Intl.DateTimeFormat('es-AR', { weekday: 'short' })
      .format(d)
      .replace('.', ''),
    day: new Intl.DateTimeFormat('es-AR', { day: '2-digit' }).format(d),
    month: new Intl.DateTimeFormat('es-AR', { month: 'short' }).format(d),
    time: new Intl.DateTimeFormat('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d),
  };
}

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
  return (
    <div
      className={cn(
        'flex items-center gap-3 min-w-0',
        align === 'right' && 'flex-row-reverse',
      )}
    >
      <TeamFlag size="md" src={flagUrl} alt={name} />
      <span
        className={cn(
          'font-display font-semibold text-sm sm:text-base text-foreground truncate',
          align === 'right' && 'text-right',
        )}
      >
        {name}
      </span>
      {finished && score !== null && score !== undefined && (
        <span className="font-display font-extrabold text-2xl text-neon tabular-nums ml-auto">
          {score}
        </span>
      )}
    </div>
  );
}

interface Props {
  match: MatchDto;
  /** Si está presente, todo el row es clickeable. Default: `/partido/{id}`. Pasar `false` para no linkear. */
  href?: string | false;
}

export function MatchRow({ match, href }: Props) {
  const ts = formatKickoff(match.startTime);
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
        <div className="hidden sm:flex flex-col items-center w-14 shrink-0 border-r border-line/40 pr-3">
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
                EN VIVO
              </Badge>
            ) : finished ? (
              <span className="text-[10px] uppercase tracking-[0.2em] text-ink-dim font-display">
                Final
              </span>
            ) : cancelled ? (
              <Badge variant="secondary">Cancelado</Badge>
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
      </div>

      {match.venue && (
        <div className="px-4 pb-3 -mt-1 flex items-center gap-2 text-[10px] uppercase tracking-[0.15em] text-ink-dim font-display">
          {match.group && (
            <span className="text-neon">Grupo {match.group.name}</span>
          )}
          {match.group && <span>·</span>}
          <span className="truncate">
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
