'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { bracketPick, topScorerPick } from '@/lib/endpoints';

interface Props {
  tournamentId: string;
}

export function TournamentAlertChips({ tournamentId }: Props) {
  const t = useTranslations('torneo.alerts');
  const [missingChampion, setMissingChampion] = useState<boolean | null>(null);
  const [missingTopScorer, setMissingTopScorer] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    bracketPick
      .mine(tournamentId)
      .then((pick) => setMissingChampion(!pick))
      .catch(() => setMissingChampion(false));
    topScorerPick
      .mine(tournamentId)
      .then((pick) => setMissingTopScorer(!pick))
      .catch(() => setMissingTopScorer(false));
  }, [tournamentId]);

  const items: { key: string; text: string }[] = [];
  if (missingChampion === true) {
    items.push({ key: 'champion', text: t('missingChampion') });
  }
  if (missingTopScorer === true) {
    items.push({ key: 'topScorer', text: t('missingTopScorer') });
  }

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <Link
          key={it.key}
          href={`/torneo/${tournamentId}`}
          className="flex items-center gap-2 rounded-md border border-amber-300/40 bg-amber-300/10 px-3 py-2 text-sm text-amber-200"
        >
          <AlertTriangle size={16} />
          <span>{it.text}</span>
        </Link>
      ))}
    </div>
  );
}
