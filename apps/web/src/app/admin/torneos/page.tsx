'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiClient } from '@/lib/api';
import {
  topScorerPick,
  tournamentPlayers,
  type TournamentPlayerDto,
} from '@/lib/endpoints';

interface TournamentRow {
  id: string;
  name: string;
  startDate: string | null;
  topScorerPlayerId: string | null;
}

export default function AdminTorneosPage() {
  const t = useTranslations('admin.torneos');
  const [tournaments, setTournaments] = useState<TournamentRow[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [players, setPlayers] = useState<TournamentPlayerDto[]>([]);
  const [playerId, setPlayerId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<TournamentRow[]>('/tournaments')
      .then((r) => setTournaments(r.data))
      .catch((e) => setError(e?.message ?? null));
  }, []);

  useEffect(() => {
    if (!selected) {
      setPlayers([]);
      setPlayerId('');
      return;
    }
    tournamentPlayers
      .list(selected)
      .then(setPlayers)
      .catch((e) => setError(e?.message ?? null));
    const row = tournaments.find((x) => x.id === selected);
    setPlayerId(row?.topScorerPlayerId ?? '');
  }, [selected, tournaments]);

  async function save(unset = false) {
    if (!selected) return;
    setSaving(true);
    setError(null);
    setInfo(null);
    try {
      const next = unset ? null : playerId || null;
      const res = await topScorerPick.setWinner(selected, next);
      setInfo(
        t('saved', { scored: res.scored, users: res.usersAffected }),
      );
      setTournaments((prev) =>
        prev.map((x) =>
          x.id === selected ? { ...x, topScorerPlayerId: next } : x,
        ),
      );
      if (unset) setPlayerId('');
    } catch (e: any) {
      const apiMsg = e?.response?.data?.message;
      setError(apiMsg ?? e?.message ?? null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="font-display text-2xl font-extrabold">{t('title')}</h1>
      <p className="text-sm text-ink-muted">{t('description')}</p>

      <label className="block text-sm font-bold">{t('tournamentLabel')}</label>
      <select
        className="w-full rounded-md border border-line/40 bg-surface-1 px-3 py-2"
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">—</option>
        {tournaments.map((x) => (
          <option key={x.id} value={x.id}>
            {x.name}
          </option>
        ))}
      </select>

      {selected && (
        <>
          <label className="block text-sm font-bold">{t('playerLabel')}</label>
          {players.length === 0 ? (
            <p className="text-sm text-ink-muted">{t('noPlayers')}</p>
          ) : (
            <select
              className="w-full rounded-md border border-line/40 bg-surface-1 px-3 py-2"
              value={playerId}
              onChange={(e) => setPlayerId(e.target.value)}
            >
              <option value="">—</option>
              {players.map((p) => (
                <option key={p.playerId} value={p.playerId}>
                  {p.team.name} — {p.name}
                  {p.position ? ` (${p.position})` : ''}
                </option>
              ))}
            </select>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={!playerId || saving}
              onClick={() => save(false)}
              className="rounded-md bg-neon px-3 py-2 text-sm font-bold text-background disabled:opacity-50"
            >
              {t('saveCta')}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => save(true)}
              className="rounded-md border border-line/40 px-3 py-2 text-sm"
            >
              {t('clearCta')}
            </button>
          </div>
        </>
      )}

      {error && <p className="text-sm font-bold text-destructive">{error}</p>}
      {info && <p className="text-sm">{info}</p>}
    </div>
  );
}
