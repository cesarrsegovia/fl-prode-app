'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import type { RankingEntry } from '@prode/shared';
import { grupos } from '@/lib/endpoints';
import { useRanking } from '@/hooks/useRanking';
import { useGroupActivity } from '@/hooks/useGroupActivity';
import { RankingTable } from '@/components/ranking/RankingTable';
import { ActivityFeed } from '@/components/grupos/ActivityFeed';
import { Chat } from '@/components/grupos/Chat';

interface GroupMemberDto {
  id: string;
  userId: string;
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  isPrivate: boolean;
  members: GroupMemberDto[];
}

type Tab = 'ranking' | 'activity' | 'chat' | 'members';

export default function GrupoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const t = useTranslations('grupos.detail');
  const router = useRouter();
  const { data: session } = useSession();
  const myUserId = (session?.user as { id?: string } | undefined)?.id;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('ranking');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const { entries, isLoading: rankingLoading } = useRanking(id);
  const {
    items: activityItems,
    isLoading: activityLoading,
    error: activityError,
  } = useGroupActivity(id);

  const load = useCallback(() => {
    grupos
      .one(id)
      .then((g) => setGroup(g as GroupDetail))
      .catch((e) => setError(e?.response?.data?.message ?? t('loadError')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const isAdmin =
    !!group && group.members.some((m) => m.userId === myUserId && m.role === 'ADMIN');

  const inviteUrl = group
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/invitacion/${group.inviteCode}`
    : '';

  const copyInvite = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  };

  const regenerateInvite = async () => {
    setRegenerating(true);
    try {
      const next = await grupos.regenerateInvite(id);
      setGroup((g) => (g ? { ...g, inviteCode: next.inviteCode } : g));
    } finally {
      setRegenerating(false);
    }
  };

  const leaveGroup = async () => {
    if (!confirm(t('confirmLeave'))) return;
    try {
      await grupos.leave(id);
      router.push('/grupos');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? t('leaveError'));
    }
  };

  const deleteGroup = async () => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      await grupos.remove(id);
      router.push('/grupos');
    } catch (e: any) {
      alert(e?.response?.data?.message ?? t('deleteError'));
    }
  };

  if (error) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <p className="text-sm text-red-400 font-bold">{error}</p>
        <Link href="/grupos" className="text-primary underline text-sm">
          {t('backShort')}
        </Link>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <div
          className="h-64 rounded-2xl animate-pulse"
          style={{ background: 'var(--surface-container-low)' }}
        />
      </main>
    );
  }

  return (
    <main className="pt-24 pb-24 px-4 max-w-5xl mx-auto">
      <Link
        href="/grupos"
        className="text-xs font-bold text-on-surface-variant hover:text-primary uppercase tracking-widest"
      >
        {t('back')}
      </Link>

      <header className="mt-2 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-sm text-on-surface-variant mt-2 max-w-xl">
              {group.description}
            </p>
          )}
          <p className="text-xs uppercase tracking-widest font-bold text-on-surface-variant mt-2">
            {t('memberCount', { count: group.members.length })} ·{' '}
            {group.isPrivate ? t('private') : t('public')}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isAdmin ? (
            <button
              onClick={deleteGroup}
              className="text-sm font-bold text-red-400 hover:bg-red-500/10 px-3 py-2 rounded-lg transition-colors"
            >
              {t('deleteGroup')}
            </button>
          ) : (
            <button
              onClick={leaveGroup}
              className="text-sm font-bold text-on-surface-variant hover:text-white hover:bg-white/5 px-3 py-2 rounded-lg transition-colors"
            >
              {t('leaveGroup')}
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex gap-2 mb-4 flex-wrap">
            <TabButton active={tab === 'ranking'} onClick={() => setTab('ranking')}>
              {t('tabs.ranking')}
            </TabButton>
            <TabButton active={tab === 'activity'} onClick={() => setTab('activity')}>
              {t('tabs.activity')}
            </TabButton>
            <TabButton active={tab === 'chat'} onClick={() => setTab('chat')}>
              {t('tabs.chat')}
            </TabButton>
            <TabButton active={tab === 'members'} onClick={() => setTab('members')}>
              {t('tabs.members', { count: group.members.length })}
            </TabButton>
          </div>

          {tab === 'ranking' && (
            <RankingTable
              entries={entries as RankingEntry[]}
              isLoading={rankingLoading}
              highlightUserId={myUserId}
            />
          )}
          {tab === 'activity' && (
            <ActivityFeed
              items={activityItems}
              isLoading={activityLoading}
              error={activityError}
            />
          )}
          {tab === 'chat' && (
            <Chat groupId={id} myUserId={myUserId} />
          )}
          {tab === 'members' && (
            <MembersList members={group.members} myUserId={myUserId} />
          )}
        </div>

        <aside className="space-y-4">
          <section
            className="rounded-2xl p-6"
            style={{ background: 'var(--surface-container-low)' }}
          >
            <h2 className="text-sm font-bold text-white uppercase tracking-widest">
              {t('invite.title')}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              {t('invite.subtitle')}
            </p>
            <div
              className="mt-4 p-3 rounded-lg font-mono text-xs break-all"
              style={{ background: 'var(--surface-container-highest)' }}
            >
              {inviteUrl}
            </div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant mt-2">
              {t('invite.codeLabel')} <span className="font-mono normal-case tracking-normal">{group.inviteCode}</span>
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={copyInvite}
                className="flex-1 bg-primary text-black text-sm font-bold py-2 rounded-lg active:scale-95 transition-transform"
              >
                {inviteCopied ? t('invite.copied') : t('invite.copy')}
              </button>
              {isAdmin && (
                <button
                  onClick={regenerateInvite}
                  disabled={regenerating}
                  className="border border-white/10 text-white text-sm font-bold py-2 px-3 rounded-lg hover:bg-white/5 disabled:opacity-50"
                >
                  {regenerating ? '…' : t('invite.regenerate')}
                </button>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
        active
          ? 'bg-primary text-black'
          : 'bg-surface-container-low text-on-surface-variant hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

function MembersList({
  members,
  myUserId,
}: {
  members: GroupMemberDto[];
  myUserId?: string;
}) {
  const t = useTranslations('grupos.members');
  const format = useFormatter();
  const sorted = [...members].sort((a, b) => {
    if (a.role === b.role) return a.user.username.localeCompare(b.user.username);
    return a.role === 'ADMIN' ? -1 : 1;
  });

  return (
    <ul className="space-y-2">
      {sorted.map((m) => {
        const isMe = m.userId === myUserId;
        return (
          <li
            key={m.id}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              isMe ? 'ring-2 ring-primary' : ''
            }`}
            style={{ background: 'var(--surface-container-low)' }}
          >
            {m.user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.user.avatarUrl}
                alt={m.user.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <span className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-sm font-black text-white">
                {m.user.username.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {m.user.username}
                {isMe && (
                  <span className="ml-2 text-xs text-primary">{t('you')}</span>
                )}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">
                {t('since', {
                  date: format.dateTime(new Date(m.joinedAt), {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  }),
                })}
              </p>
            </div>
            {m.role === 'ADMIN' && (
              <span className="text-[10px] font-black uppercase tracking-widest bg-primary/10 text-primary px-2 py-1 rounded-full">
                {t('admin')}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
