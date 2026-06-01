import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { GroupWithStandingsDto } from '@/lib/server-endpoints';
import { TeamFlag } from './TeamFlag';

function StandingsRow({
  position,
  team,
  played,
  won,
  drawn,
  lost,
  goalDiff,
  points,
}: {
  position: number;
  team: { id: string; name: string; flagUrl: string | null; shortName: string | null };
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalDiff: number;
  points: number;
}) {
  const qualifies = position <= 2;
  const playoff = position === 3;

  return (
    <tr className="border-t border-line/40">
      <td className="py-2 pr-2 font-display font-bold tabular-nums w-6 relative">
        {qualifies && (
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-neon rounded-full" />
        )}
        {playoff && (
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-citrus/60 rounded-full" />
        )}
        <span className={qualifies ? 'text-neon' : 'text-ink-muted'}>
          {position}
        </span>
      </td>
      <td className="py-2 pr-2">
        <Link
          href={`/seleccion/${team.id}`}
          className="flex items-center gap-2 hover:text-neon transition-colors"
        >
          <TeamFlag size="sm" src={team.flagUrl} alt={team.name} />
          <span className="font-display font-semibold text-sm truncate max-w-[140px]">
            {team.shortName ?? team.name}
          </span>
        </Link>
      </td>
      <td className="py-2 px-1 text-center text-xs text-ink-muted tabular-nums">
        {played}
      </td>
      <td className="hidden sm:table-cell py-2 px-1 text-center text-xs text-ink-muted tabular-nums">
        {won}-{drawn}-{lost}
      </td>
      <td className="py-2 px-1 text-center text-xs tabular-nums">
        <span
          className={
            goalDiff > 0
              ? 'text-neon'
              : goalDiff < 0
                ? 'text-destructive'
                : 'text-ink-muted'
          }
        >
          {goalDiff > 0 ? '+' : ''}
          {goalDiff}
        </span>
      </td>
      <td className="py-2 pl-2 text-right font-display font-extrabold tabular-nums text-foreground">
        {points}
      </td>
    </tr>
  );
}

interface Props {
  group: GroupWithStandingsDto;
}

export function GroupStandings({ group }: Props) {
  const t = useTranslations('torneo.standings');
  const rows = group.standings.length
    ? group.standings
    : group.teams.map((tt, idx) => ({
        id: tt.team.id,
        position: idx + 1,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDiff: 0,
        points: 0,
        team: tt.team,
      }));

  return (
    <Card className="bg-surface-1 border-line">
      <CardHeader className="pb-2">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display font-extrabold text-4xl text-foreground tracking-tight">
            <span className="text-neon">{group.name}</span>
          </h3>
          <span className="text-[10px] font-display uppercase tracking-[0.2em] text-ink-dim">
            {t('group')}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.15em] text-ink-dim font-display">
                <th scope="col" className="text-left pr-2 pb-1 font-medium">
                  <span className="sr-only">{t('position')}</span>
                </th>
                <th scope="col" className="text-left pr-2 pb-1 font-medium">{t('team')}</th>
                <th scope="col" className="px-1 pb-1 text-center font-medium">{t('played')}</th>
                <th scope="col" className="hidden sm:table-cell px-1 pb-1 text-center font-medium">
                  {t('record')}
                </th>
                <th scope="col" className="px-1 pb-1 text-center font-medium">{t('goalDiff')}</th>
                <th scope="col" className="pl-2 pb-1 text-right font-medium">{t('points')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <StandingsRow
                  key={s.id}
                  position={s.position}
                  team={s.team}
                  played={s.played}
                  won={s.won}
                  drawn={s.drawn}
                  lost={s.lost}
                  goalDiff={s.goalDiff}
                  points={s.points}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-2 border-t border-line/30">
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-dim font-display">
            <span className="w-0.5 h-4 rounded-full bg-neon inline-block" aria-hidden="true" />
            {t('legendQualifies')}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-ink-dim font-display">
            <span className="w-0.5 h-4 rounded-full bg-citrus/60 inline-block" aria-hidden="true" />
            {t('legendPlayoff')}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
