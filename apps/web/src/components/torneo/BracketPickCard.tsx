'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Trophy, Check } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty';
import { bracketPick, type BracketPickResponse } from '@/lib/endpoints';
import { TeamFlag } from './TeamFlag';
import { FlagCombobox } from './FlagCombobox';

interface TeamOption {
  id: string;
  name: string;
  shortName: string | null;
  flagUrl: string | null;
  group: string | null;
}

interface Props {
  tournamentId: string;
  teams: TeamOption[];
}

export function BracketPickCard({
  tournamentId,
  teams,
}: Props) {
  const t = useTranslations('torneo.champion');
  const tCommon = useTranslations('torneo.common');
  const tCombo = useTranslations('torneo.combobox');
  const [current, setCurrent] = useState<BracketPickResponse | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [deadline, setDeadline] = useState<Date | null>(null);

  useEffect(() => {
    Promise.all([
      bracketPick.mine(tournamentId),
      bracketPick.deadline(tournamentId),
    ])
      .then(([pick, dl]) => {
        setCurrent(pick);
        setDeadline(dl.deadline ? new Date(dl.deadline) : null);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [tournamentId]);

  const locked = deadline ? deadline <= new Date() : false;

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.group && b.group && a.group !== b.group) {
        return a.group.localeCompare(b.group);
      }
      return a.name.localeCompare(b.name);
    });
  }, [teams]);

  const pick = async (teamId: string) => {
    setSubmitting(teamId);
    setError(null);
    try {
      const next = await bracketPick.set(tournamentId, teamId);
      setCurrent(next);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.message;
      const status = err?.response?.status;
      const fallback = err?.message ?? t('saveError');
      setError(apiMsg ?? (status ? `${status}: ${fallback}` : fallback));
      console.error('BracketPick set error', err);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <Card className="bg-surface-1 border-neon/30">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Trophy className="size-4 text-neon" />
          <span className="font-display text-xs uppercase tracking-[0.25em] text-neon">
            {t('eyebrow')}
          </span>
        </div>
        <h3 className="font-display font-extrabold text-2xl text-foreground tracking-tight">
          {current ? t('titleChange') : t('titleInitial')}
        </h3>
        <p className="text-sm text-ink-muted mt-1">
          {t('subtitle')}
        </p>
        {current && (
          <div className="mt-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-neon/10 border border-neon/40">
            <TeamFlag
              size="md"
              src={current.champTeam.flagUrl}
              alt={current.champTeam.name}
            />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-neon">
                {t('currentPick')}
              </p>
              <p className="font-display font-extrabold text-foreground">
                {current.champTeam.name}
              </p>
            </div>
            <Check className="size-5 text-neon" />
          </div>
        )}
        {locked && (
          <Badge variant="outline" className="mt-3 w-fit">
            {t('locked')}
          </Badge>
        )}
      </CardHeader>

      <CardContent>
        {!loaded ? (
          <p className="text-sm text-ink-muted">{tCommon('loading')}</p>
        ) : teams.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>{t('titleInitial')}</EmptyTitle>
              <EmptyDescription>{t('subtitle')}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : locked && current ? null : !locked ? (
          <FlagCombobox
            options={sortedTeams.map((tm) => ({
              id: tm.id,
              label: tm.name,
              sublabel: tm.group ?? undefined,
              image: <TeamFlag size="sm" src={tm.flagUrl} alt={tm.name} />,
            }))}
            value={current?.champTeamId}
            disabled={submitting !== null}
            placeholder={tCombo('select')}
            searchPlaceholder={tCombo('search')}
            noResultsLabel={tCombo('noResults')}
            onSelect={(id) => pick(id)}
          />
        ) : (
          <p className="text-sm text-ink-muted">{t('locked')}</p>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive font-bold mt-3">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
