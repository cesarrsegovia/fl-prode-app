import type { FixtureScheduleDto, MatchDto } from '@/lib/server-endpoints';
import { MatchRow } from './MatchRow';

function groupMatchesByDate(matches: MatchDto[]) {
  const map = new Map<string, MatchDto[]>();
  for (const m of matches) {
    const key = new Date(m.startTime).toISOString().slice(0, 10);
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function formatDateHeading(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

interface Props {
  schedule: FixtureScheduleDto[];
}

export function MatchdayList({ schedule }: Props) {
  return (
    <div className="space-y-12">
      {schedule.map((fixture) => {
        const days = groupMatchesByDate(fixture.matches);
        return (
          <section key={fixture.id}>
            <header className="flex items-baseline justify-between gap-4 mb-4 px-1">
              <h3 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
                {fixture.name ?? `Fecha ${fixture.round}`}
              </h3>
              <span className="text-xs uppercase tracking-[0.2em] text-ink-dim font-display">
                {fixture.matches.length}{' '}
                {fixture.matches.length === 1 ? 'partido' : 'partidos'}
              </span>
            </header>

            <div className="space-y-6">
              {days.map(([day, matches]) => (
                <div key={day}>
                  <p className="font-display text-xs uppercase tracking-[0.2em] text-neon mb-2 pl-1">
                    {formatDateHeading(day)}
                  </p>
                  <div className="space-y-2">
                    {matches.map((m) => (
                      <MatchRow key={m.id} match={m} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
