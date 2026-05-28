'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { MyGroupEntry } from '@/lib/endpoints';
import { grupos } from '@/lib/endpoints';
import { GroupCard } from '@/components/grupos/GroupCard';

export default function GruposPage() {
  const t = useTranslations('grupos.list');
  const [items, setItems] = useState<MyGroupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none');

  const load = () => {
    setIsLoading(true);
    grupos
      .mine()
      .then(setItems)
      .catch((e) => setError(e?.message ?? t('loadError')))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="pt-24 pb-24 px-4 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setMode(mode === 'join' ? 'none' : 'join')}
            className="border border-primary/40 text-primary px-4 py-2 rounded-xl font-bold text-sm hover:bg-primary/10 transition-colors"
          >
            {t('joinWithCode')}
          </button>
          <button
            onClick={() => setMode(mode === 'create' ? 'none' : 'create')}
            className="bg-primary text-black px-4 py-2 rounded-xl font-bold text-sm active:scale-95"
          >
            {t('createGroup')}
          </button>
        </div>
      </header>

      {mode === 'create' && (
        <CreateGroupForm
          onCreated={() => {
            setMode('none');
            load();
          }}
        />
      )}
      {mode === 'join' && (
        <JoinGroupForm
          onJoined={() => {
            setMode('none');
            load();
          }}
        />
      )}

      {error && <p className="text-sm text-red-400 font-bold">{error}</p>}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl animate-pulse"
              style={{ background: 'var(--surface-container-low)' }}
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: 'var(--surface-container-low)' }}
        >
          <p className="text-sm text-on-surface-variant">
            {t('empty')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((entry) => (
            <GroupCard key={entry.group.id} entry={entry} />
          ))}
        </div>
      )}
    </main>
  );
}

function CreateGroupForm({ onCreated }: { onCreated: () => void }) {
  const t = useTranslations('grupos.create');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await grupos.create({
        name,
        description: description || undefined,
        isPrivate,
      });
      onCreated();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl p-6 mb-6 space-y-3"
      style={{ background: 'var(--surface-container-low)' }}
    >
      <input
        required
        minLength={3}
        placeholder={t('namePlaceholder')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-white placeholder:text-on-surface-variant"
      />
      <textarea
        placeholder={t('descPlaceholder')}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-white placeholder:text-on-surface-variant"
        rows={2}
      />

      <fieldset className="space-y-2">
        <legend className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-1">
          {t('privacyLabel')}
        </legend>
        <div className="flex gap-2">
          <PrivacyOption
            active={isPrivate}
            label={t('private')}
            onClick={() => setIsPrivate(true)}
          />
          <PrivacyOption
            active={!isPrivate}
            label={t('public')}
            onClick={() => setIsPrivate(false)}
          />
        </div>
        <p className="text-[11px] text-on-surface-variant">{t('privacyHint')}</p>
      </fieldset>

      {error && <p className="text-xs text-red-400 font-bold">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="bg-primary text-black px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}

function PrivacyOption({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
        active
          ? 'bg-primary text-black'
          : 'bg-surface-container-highest text-on-surface-variant hover:text-white'
      }`}
    >
      {label}
    </button>
  );
}

function JoinGroupForm({ onJoined }: { onJoined: () => void }) {
  const t = useTranslations('grupos.join');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await grupos.join(inviteCode.trim());
      onJoined();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl p-6 mb-6 flex items-end gap-3"
      style={{ background: 'var(--surface-container-low)' }}
    >
      <div className="flex-1">
        <label className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mb-1 block">
          {t('label')}
        </label>
        <input
          required
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="w-full bg-surface-container-highest rounded-lg px-4 py-3 text-white"
          placeholder={t('placeholder')}
        />
        {error && (
          <p className="text-xs text-red-400 font-bold mt-2">{error}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-primary text-black px-4 py-2 rounded-xl font-bold text-sm disabled:opacity-50"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}
