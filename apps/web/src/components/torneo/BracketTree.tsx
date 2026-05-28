import { useFormatter, useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { MatchDto } from '@/lib/server-endpoints';
import { TeamFlag } from './TeamFlag';

type Stage = MatchDto['stage'];

const STAGE_ORDER: Stage[] = [
  'R32',
  'R16',
  'QUARTERFINAL',
  'SEMIFINAL',
  'THIRD_PLACE',
  'FINAL',
];

function BracketSide({
  name,
  team,
  score,
  finished,
}: {
  name: string;
  team: MatchDto['homeTeam'];
  score: number | null;
  finished: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="flex items-center gap-2 min-w-0">
        <TeamFlag size="sm" src={team?.flagUrl ?? null} alt={team?.name ?? name} />
        <span
          className={cn(
            'font-display text-sm truncate',
            team ? 'font-semibold text-foreground' : 'italic text-ink-muted',
          )}
        >
          {team?.shortName ?? team?.name ?? name}
        </span>
      </span>
      {finished && score !== null && (
        <span className="font-display font-extrabold text-base text-neon tabular-nums">
          {score}
        </span>
      )}
    </div>
  );
}

function BracketMatch({ match }: { match: MatchDto }) {
  const format = useFormatter();
  const finished = match.status === 'FINISHED';
  const live = match.status === 'LIVE';
  return (
    <article
      className={cn(
        'min-w-[220px] rounded-xl border bg-surface-1 px-3 py-2 transition-colors',
        live ? 'border-neon/70 ring-1 ring-neon/30' : 'border-line/60',
      )}
    >
      <BracketSide
        name={match.homeTeamName}
        team={match.homeTeam ?? null}
        score={match.homeScore}
        finished={finished}
      />
      <div className="h-px bg-line/40" />
      <BracketSide
        name={match.awayTeamName}
        team={match.awayTeam ?? null}
        score={match.awayScore}
        finished={finished}
      />
      <div className="mt-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.15em] text-ink-dim font-display">
        <span>
          {format.dateTime(new Date(match.startTime), {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {match.venue && <span className="truncate">{match.venue.city}</span>}
      </div>
    </article>
  );
}

interface Props {
  matches: MatchDto[];
}

export function BracketTree({ matches }: Props) {
  const t = useTranslations('torneo.stages');
  const byStage = new Map<Stage, MatchDto[]>();
  for (const m of matches) {
    const arr = byStage.get(m.stage) ?? [];
    arr.push(m);
    byStage.set(m.stage, arr);
  }
  for (const arr of byStage.values()) {
    arr.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }

  const presentStages = STAGE_ORDER.filter((s) => byStage.has(s));

  return (
    <div className="overflow-x-auto pb-4 -mx-6 px-6">
      <div className="flex gap-6 items-start min-w-fit">
        {presentStages.map((stage) => (
          <div key={stage} className="flex flex-col gap-3 min-w-[240px]">
            <h4 className="font-display text-xs uppercase tracking-[0.2em] text-neon">
              {t(stage)}
            </h4>
            {byStage.get(stage)!.map((m) => (
              <BracketMatch key={m.id} match={m} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
