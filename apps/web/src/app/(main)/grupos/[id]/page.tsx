'use client';

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/lib/session';
import { useFormatter, useTranslations } from 'next-intl';
import type { RankingEntry } from '@prode/shared';
import { grupos } from '@/lib/endpoints';
import { useRanking } from '@/hooks/useRanking';
import { useGroupActivity } from '@/hooks/useGroupActivity';
import { RankingTable } from '@/components/ranking/RankingTable';
import { ActivityFeed } from '@/components/grupos/ActivityFeed';
import { Chat } from '@/components/grupos/Chat';
import { UserAvatar } from '@/components/ui/user-avatar';
import { displayName } from '@/lib/display-name';

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
  const [tab, setTab] = useState<Tab>('members');
  const [inviteCopied, setInviteCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

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

  const flashCopied = () => {
    setCopyFailed(false);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 1500);
  };

  const copyInvite = async () => {
    if (!group) return;
    // Dentro de Gamblor el dominio del deploy no es navegable, así que
    // compartimos solo el código de invitación (no la URL).
    const inviteText = group.inviteCode;
    // Preferred: async Clipboard API (requires secure context + permission).
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteText);
        flashCopied();
        return;
      }
    } catch {
      /* fall through to the legacy fallback below */
    }
    // Fallback: hidden textarea + execCommand for http/insecure contexts.
    try {
      const ta = document.createElement('textarea');
      ta.value = inviteText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) {
        flashCopied();
        return;
      }
      throw new Error('execCommand copy failed');
    } catch {
      setCopyFailed(true);
      setTimeout(() => setCopyFailed(false), 2000);
    }
  };

  const regenerateInvite = async () => {
    setRegenerating(true);
    setRegenerateError(null);
    try {
      const next = await grupos.regenerateInvite(id);
      setGroup((g) => (g ? { ...g, inviteCode: next.inviteCode } : g));
    } catch (e: any) {
      setRegenerateError(e?.response?.data?.message ?? t('invite.regenerateError'));
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
        <p className="text-sm text-destructive font-bold" role="alert">{error}</p>
        <Link href="/grupos" className="text-neon underline text-sm">
          {t('backShort')}
        </Link>
      </main>
    );
  }

  if (!group) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <div className="h-64 rounded-2xl animate-pulse bg-surface-1" />
      </main>
    );
  }

  return (
    <main className="pt-24 pb-24 px-4 max-w-5xl mx-auto">
      <Link
        href="/grupos"
        className="text-xs font-bold text-ink-muted hover:text-neon uppercase tracking-widest"
      >
        {t('back')}
      </Link>

      <header className="mt-2 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-foreground tracking-tight">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-sm text-ink-muted mt-2 max-w-xl">
              {group.description}
            </p>
          )}
          <p className="text-xs uppercase tracking-widest font-bold text-ink-muted mt-2">
            {t('memberCount', { count: group.members.length })} ·{' '}
            {group.isPrivate ? t('private') : t('public')}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {isAdmin ? (
            <button
              onClick={deleteGroup}
              className="text-sm font-bold text-destructive hover:bg-destructive/10 px-3 py-2 rounded-lg transition-colors"
            >
              {t('deleteGroup')}
            </button>
          ) : (
            <button
              onClick={leaveGroup}
              className="text-sm font-bold text-ink-muted hover:text-foreground hover:bg-line/10 px-3 py-2 rounded-lg transition-colors"
            >
              {t('leaveGroup')}
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="flex gap-2 mb-4 flex-wrap" role="tablist">
            <TabButton active={tab === 'ranking'} value="ranking" onClick={() => setTab('ranking')}>
              {t('tabs.ranking')}
            </TabButton>
            <TabButton active={tab === 'activity'} value="activity" onClick={() => setTab('activity')}>
              {t('tabs.activity')}
            </TabButton>
            <TabButton active={tab === 'chat'} value="chat" onClick={() => setTab('chat')}>
              {t('tabs.chat')}
            </TabButton>
            <TabButton active={tab === 'members'} value="members" onClick={() => setTab('members')}>
              {t('tabs.members', { count: group.members.length })}
            </TabButton>
          </div>

          <div role="tabpanel" id="group-tabpanel" aria-labelledby={`tab-${tab}`}>
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
              <MembersList members={group.members} myUserId={myUserId} groupId={id} />
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl p-6 bg-surface-1">
            <h2 className="text-sm font-bold text-foreground uppercase tracking-widest">
              {t('invite.title')}
            </h2>
            <p className="text-sm text-ink-muted mt-1">
              {t('invite.subtitle')}
            </p>
            <div className="mt-4 p-3 rounded-lg font-mono text-base font-bold tracking-wide break-all bg-surface-2 text-foreground text-center select-all">
              {group.inviteCode}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={copyInvite}
                className={`flex-1 text-sm font-bold py-2 rounded-lg active:scale-95 transition-transform ${
                  copyFailed ? 'bg-destructive/20 text-destructive' : 'bg-neon text-primary-foreground'
                }`}
              >
                {copyFailed
                  ? t('invite.copyFailed')
                  : inviteCopied
                    ? t('invite.copied')
                    : t('invite.copy')}
              </button>
              {isAdmin && (
                <button
                  onClick={regenerateInvite}
                  disabled={regenerating}
                  className="border border-line text-foreground text-sm font-bold py-2 px-3 rounded-lg hover:bg-line/10 disabled:opacity-50"
                >
                  {regenerating ? '…' : t('invite.regenerate')}
                </button>
              )}
            </div>
            {regenerateError && (
              <p className="mt-2 text-xs text-destructive font-bold" role="alert">{regenerateError}</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function TabButton({
  active,
  value,
  onClick,
  children,
}: {
  active: boolean;
  value: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      id={`tab-${value}`}
      aria-selected={active}
      aria-controls="group-tabpanel"
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
        active
          ? 'bg-neon text-primary-foreground'
          : 'bg-surface-1 text-ink-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function MembersList({
  members,
  myUserId,
  groupId,
}: {
  members: GroupMemberDto[];
  myUserId?: string;
  groupId: string;
}) {
  const t = useTranslations('grupos.members');
  const format = useFormatter();
  const sorted = [...members].sort((a, b) => {
    if (a.role === b.role)
      return displayName(a.user.username, a.userId).localeCompare(
        displayName(b.user.username, b.userId),
      );
    return a.role === 'ADMIN' ? -1 : 1;
  });

  return (
    <ul className="space-y-2">
      {sorted.map((m) => {
        const isMe = m.userId === myUserId;
        return (
          <li
            key={m.id}
            className={`flex items-center gap-3 p-3 rounded-xl bg-surface-1 ${
              isMe ? 'ring-2 ring-neon' : ''
            }`}
          >
            <UserAvatar
              name={displayName(m.user.username, m.userId)}
              image={m.user.avatarUrl}
              size="default"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {displayName(m.user.username, m.userId)}
                {isMe && (
                  <span className="ml-2 text-xs text-neon">{t('you')}</span>
                )}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-ink-muted font-bold">
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
              <span className="text-[10px] font-black uppercase tracking-widest bg-neon/10 text-neon px-2 py-1 rounded-full">
                {t('admin')}
              </span>
            )}
            {!isMe && (
              <Link
                href={`/grupos/${groupId}/miembro/${m.userId}`}
                className="text-[10px] font-display font-bold uppercase tracking-widest text-neon hover:underline shrink-0"
              >
                {t('viewProde')}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
