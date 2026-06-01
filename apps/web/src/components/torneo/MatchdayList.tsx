import { useFormatter, useTranslations } from 'next-intl';
import type { FixtureScheduleDto, MatchDto } from '@/lib/server-endpoints';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { MatchRow } from './MatchRow';

// Debe coincidir con la timeZone configurada en src/i18n/request.ts.
// MatchdayList es Server Component: usar métodos nativos de Date agruparía
// en la TZ del servidor (UTC), inconsistente con MatchRow que formatea en
// esta zona. Agrupamos explícitamente en la TZ de la app.
const APP_TIME_ZONE = 'America/Argentina/Buenos_Aires';

function localDateKey(d: Date): string {
  // en-CA produce el formato YYYY-MM-DD; timeZone fuerza la zona de la app.
  return new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIME_ZONE }).format(d);
}

function groupMatchesByDate(matches: MatchDto[]) {
  const map = new Map<string, MatchDto[]>();
  for (const m of matches) {
    const key = localDateKey(new Date(m.startTime));
    const arr = map.get(key) ?? [];
    arr.push(m);
    map.set(key, arr);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

interface Props {
  schedule: FixtureScheduleDto[];
}

export function MatchdayList({ schedule }: Props) {
  const t = useTranslations('torneo.matchday');
  const format = useFormatter();
  const formatDateHeading = (localKey: string) => {
    // localKey es YYYY-MM-DD en la TZ de la app. Mediodía UTC formateado por
    // next-intl (que aplica APP_TIME_ZONE) cae en el mismo día calendario.
    const noonUtc = new Date(`${localKey}T12:00:00Z`);
    return format.dateTime(noonUtc, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  if (schedule.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{t('emptyTitle')}</EmptyTitle>
          <EmptyDescription>{t('emptyDescription')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-12">
      {schedule.map((fixture) => {
        const days = groupMatchesByDate(fixture.matches);
        return (
          <section key={fixture.id}>
            <header className="flex items-baseline justify-between gap-4 mb-4 px-1">
              <h3 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
                {fixture.name ?? t('fallbackName', { round: fixture.round })}
              </h3>
              <span className="text-xs uppercase tracking-[0.2em] text-ink-dim font-display">
                {t('matchesCount', { count: fixture.matches.length })}
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
