import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Users } from 'lucide-react';
import { teamApi, tournamentApi } from '@/lib/server-endpoints';
import { TeamFlag } from '@/components/torneo/TeamFlag';
import { MatchRow } from '@/components/torneo/MatchRow';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('seleccion');
  try {
    const team = await teamApi.one(id);
    return { title: t('metaTitle', { name: team.name }) };
  } catch {
    return { title: t('metaFallback') };
  }
}

export default async function SeleccionPage({ params }: Props) {
  const { id } = await params;
  const t = await getTranslations('seleccion');

  let team;
  try {
    team = await teamApi.one(id);
  } catch {
    notFound();
  }

  const activeTournament = await tournamentApi.active().catch(() => null);
  const activeMembership = team.tournamentTeams.find(
    (tt) => tt.tournament.isActive,
  );

  const [matches, squad] = activeTournament
    ? await Promise.all([
        teamApi.matches(id, activeTournament.id).catch(() => []),
        teamApi.squad(id, activeTournament.id).catch(() => []),
      ])
    : [[], []];

  return (
    <main className="pt-24 pb-24 px-4 max-w-5xl mx-auto">
      {activeTournament && (
        <Link
          href={`/torneo/${activeTournament.id}`}
          className="inline-flex items-center gap-1 text-[10px] font-display font-bold text-ink-muted hover:text-neon uppercase tracking-[0.18em]"
        >
          ← {activeTournament.name}
        </Link>
      )}

      <header className="mt-3 mb-10 flex flex-col md:flex-row md:items-end gap-6">
        <TeamFlag src={team.flagUrl} alt={team.name} size="xl" className="size-28 md:size-32" />
        <div className="flex-1">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-neon mb-2">
            {t('eyebrow')}
          </p>
          <h1 className="font-display font-extrabold text-foreground text-[clamp(2.5rem,7vw,5rem)] tracking-[-0.04em] leading-[0.95]">
            {team.name}
          </h1>
          <div className="mt-3 flex items-center gap-3 flex-wrap text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-dim">
            {team.shortName && <span>{team.shortName}</span>}
            {team.confederation && (
              <>
                <span>·</span>
                <span>{team.confederation}</span>
              </>
            )}
            {activeMembership?.group && (
              <>
                <span>·</span>
                <span className="text-neon">{t('group', { name: activeMembership.group.name })}</span>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mb-12">
        <h2 className="font-display font-extrabold text-xl text-foreground mb-4 tracking-tight">
          {t('schedule')}
        </h2>
        {matches.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t('noMatchesTitle')}</EmptyTitle>
              <EmptyDescription>
                {t('noMatchesDesc')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {matches.map((m) => (
              <MatchRow key={m.id} match={m} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display font-extrabold text-xl text-foreground mb-4 tracking-tight flex items-center gap-2">
          <Users className="size-5 text-neon" />
          {t('squad')}
        </h2>
        {squad.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t('noSquadTitle')}</EmptyTitle>
              <EmptyDescription>
                {t('noSquadDesc')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Card className="bg-surface-1 border-line">
            <CardContent className="p-4">
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {squad.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2"
                  >
                    {p.number !== null && (
                      <span className="size-8 rounded-full bg-neon/15 text-neon font-display font-extrabold text-sm flex items-center justify-center tabular-nums shrink-0">
                        {p.number}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-display font-semibold text-sm text-foreground truncate">
                        {p.name}
                      </p>
                      {p.position && (
                        <p className="text-[10px] uppercase tracking-[0.18em] font-display text-ink-dim">
                          {p.position}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}
