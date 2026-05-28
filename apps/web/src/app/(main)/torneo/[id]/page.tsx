import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Skeleton } from '@/components/ui/skeleton';
import { tournamentApi } from '@/lib/server-endpoints';
import { TournamentHero } from '@/components/torneo/TournamentHero';
import { GroupStandings } from '@/components/torneo/GroupStandings';
import { MatchdayList } from '@/components/torneo/MatchdayList';
import { BracketTree } from '@/components/torneo/BracketTree';
import { VenueCard } from '@/components/torneo/VenueCard';
import { BracketPickCard } from '@/components/torneo/BracketPickCard';
import { TopScorerPickCard } from '@/components/torneo/TopScorerPickCard';
import { R32PicksCard } from '@/components/torneo/R32PicksCard';
import { TournamentAlertChips } from '@/components/torneo/TournamentAlertChips';
import { TournamentTabs } from './TournamentTabs';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('torneo');
  try {
    const tournament = await tournamentApi.one(id);
    return {
      title: t('metaTitle', { name: tournament.name }),
      description: t('metaDescription', { name: tournament.name }),
    };
  } catch {
    return { title: t('metaFallback') };
  }
}

export default async function TorneoPage({ params }: Props) {
  const { id } = await params;

  let tournament;
  try {
    tournament = await tournamentApi.one(id);
  } catch {
    notFound();
  }

  const [groups, schedule, venues, bracket, teams] = await Promise.all([
    tournamentApi.groups(id),
    tournamentApi.schedule(id),
    tournamentApi.venues(id),
    tournamentApi.bracket(id),
    tournamentApi.teams(id),
  ]);

  const teamOptions = teams.map((t) => ({
    id: t.id,
    name: t.name,
    shortName: t.shortName,
    flagUrl: t.flagUrl,
    group: t.group,
  }));

  return (
    <main className="pb-24">
      <TournamentHero tournament={tournament} />

      <div className="px-6 max-w-6xl mx-auto space-y-10">
        <TournamentAlertChips tournamentId={tournament.id} />

        <BracketPickCard
          tournamentId={tournament.id}
          tournamentStartDate={tournament.startDate}
          teams={teamOptions}
        />

        <TopScorerPickCard
          tournamentId={tournament.id}
          tournamentStartDate={tournament.startDate}
          topScorerDeadline={tournament.topScorerDeadline ?? null}
        />

        <R32PicksCard tournamentId={tournament.id} teams={teamOptions} />

        <TournamentTabs
          grupos={
            <Suspense fallback={<TabSkeleton />}>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {groups.map((g) => (
                  <GroupStandings key={g.id} group={g} />
                ))}
              </div>
            </Suspense>
          }
          calendario={
            <Suspense fallback={<TabSkeleton />}>
              <MatchdayList schedule={schedule} />
            </Suspense>
          }
          eliminatorias={
            <Suspense fallback={<TabSkeleton />}>
              <BracketTree matches={bracket} />
            </Suspense>
          }
          estadios={
            <Suspense fallback={<TabSkeleton />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {venues.map((v) => (
                  <VenueCard key={v.id} venue={v} />
                ))}
              </div>
            </Suspense>
          }
        />
      </div>
    </main>
  );
}

function TabSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}
