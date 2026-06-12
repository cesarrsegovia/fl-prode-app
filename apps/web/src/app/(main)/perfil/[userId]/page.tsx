'use client';

import { use, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/session';
import { useFormatter, useTranslations } from 'next-intl';
import {
  Trophy,
  Flame,
  Medal,
  TrendingUp,
  Target,
  Sparkles,
  Crown,
  CheckCircle2,
  Lock,
  Pencil,
} from 'lucide-react';
import type { RankingEntry } from '@prode/shared';
import { apiClient } from '@/lib/api';
import { ranking, stats, users, type AchievementDto, type UserStats } from '@/lib/endpoints';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { cn } from '@/lib/utils';

interface UserDto {
  id: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
}

function getInitials(name: string | null | undefined) {
  if (!name?.trim()) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function diceBearAvatar(seed: string) {
  const safe = encodeURIComponent(seed.trim().toLowerCase() || 'prode');
  return `https://api.dicebear.com/9.x/personas/svg?seed=${safe}&backgroundColor=b6f23d,45fc9b,1de9b6&radius=50`;
}

const ACHIEVEMENT_ICONS: Record<string, typeof Trophy> = {
  FIRST_PREDICTION: Sparkles,
  EXACT_SCORE: Target,
  STREAK_5: Flame,
  STREAK_10: Flame,
  PERFECT_ROUND: Medal,
  BRACKET_CHAMPION: Crown,
};

function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  highlight,
}: {
  label: string;
  value: string | number;
  icon: typeof Trophy;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <Card className="bg-surface-1 border-line">
      <CardContent className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Icon className={highlight ? 'size-4 text-neon' : 'size-4 text-ink-muted'} />
          <p className="text-[10px] font-display font-bold uppercase tracking-[0.2em] text-ink-muted">
            {label}
          </p>
        </div>
        <p
          className={cn(
            'font-display font-extrabold tabular-nums',
            highlight ? 'text-4xl text-neon' : 'text-4xl text-foreground',
          )}
        >
          {value}
        </p>
        {hint && (
          <p className="text-[10px] uppercase tracking-[0.15em] font-display text-ink-dim mt-1">
            {hint}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function AchievementCard({ achievement }: { achievement: AchievementDto }) {
  const t = useTranslations('perfil');
  const format = useFormatter();
  const Icon = ACHIEVEMENT_ICONS[achievement.key] ?? Trophy;
  const unlocked = achievement.unlocked;
  // El name/description vienen sembrados en español desde la BD; traducimos por
  // `key` (estable) y caemos al dato si no hay clave para ese logro.
  const nameKey = `achievements.${achievement.key}.name`;
  const descKey = `achievements.${achievement.key}.description`;
  const name = t.has(nameKey) ? t(nameKey) : achievement.name;
  const description = t.has(descKey) ? t(descKey) : achievement.description;
  return (
    <Card
      className={cn(
        'transition-all',
        unlocked
          ? 'bg-neon/5 border-neon/40'
          : 'bg-surface-1 border-line opacity-60',
      )}
    >
      <CardContent className="p-4 flex items-start gap-3">
        <div
          className={cn(
            'size-10 rounded-lg flex items-center justify-center shrink-0',
            unlocked ? 'bg-neon/15 text-neon' : 'bg-surface-2 text-ink-dim',
          )}
        >
          {unlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-display font-extrabold text-sm text-foreground">
              {name}
            </p>
            {unlocked && <CheckCircle2 className="size-3.5 text-neon" />}
          </div>
          <p className="text-xs text-ink-muted">{description}</p>
          {unlocked && achievement.unlockedAt && (
            <p className="text-[10px] uppercase tracking-[0.18em] font-display font-bold text-neon mt-2">
              {t('unlockedOn', {
                date: format.dateTime(new Date(achievement.unlockedAt), {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
              })}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PerfilPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const t = useTranslations('perfil');
  const format = useFormatter();
  const { data: session } = useSession();
  const isMe = session?.user?.id === userId;

  const [user, setUser] = useState<UserDto | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<AchievementDto[]>([]);
  const [rankingEntry, setRankingEntry] = useState<RankingEntry | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      apiClient.get<UserDto>(`/users/${userId}`).then((r) => r.data),
      stats.user(userId).catch(() => null),
      isMe ? stats.achievements().catch(() => []) : Promise.resolve([]),
      ranking.global().catch(() => []),
    ])
      .then(([u, st, ach, rk]) => {
        setUser(u);
        setUserStats(st);
        setAchievements(ach);
        const entry = rk.find((r) => r.userId === userId);
        if (entry) setRankingEntry(entry);
      })
      .catch((e) =>
        setError(e?.response?.data?.message ?? t('loadError')),
      )
      .finally(() => setIsLoading(false));
  }, [userId, isMe]);

  function openEdit() {
    if (!user) return;
    setEditUsername(user.username ?? '');
    setEditBio(user.bio ?? '');
    setEditError(null);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function saveEdit() {
    if (!user) return;
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await users.updateMe({
        username: editUsername.trim() || undefined,
        bio: editBio.trim() || undefined,
      });
      setUser((prev) => prev ? { ...prev, username: updated.username, bio: updated.bio } : prev);
      setEditing(false);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setEditError(msg ?? t('editError'));
    } finally {
      setEditSaving(false);
    }
  }

  if (error) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <p className="text-sm text-destructive font-bold">{error}</p>
      </main>
    );
  }

  if (isLoading || !user) {
    return (
      <main className="pt-24 pb-12 px-4 max-w-3xl mx-auto">
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  const memberSince = format.dateTime(new Date(user.createdAt), {
    month: 'long',
    year: 'numeric',
  });

  const displayName = user.username ?? userId;
  const avatar = user.avatarUrl ?? diceBearAvatar(displayName);

  return (
    <main className="pt-24 pb-24 px-4 max-w-5xl mx-auto">
      <header className="mb-12 flex flex-col md:flex-row md:items-end gap-6">
        <Avatar size="lg" className="size-28 md:size-32">
          <AvatarImage src={avatar} alt={displayName} />
          <AvatarFallback className="bg-neon text-primary-foreground text-2xl font-display font-extrabold">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <p className="font-display text-xs uppercase tracking-[0.25em] text-neon mb-2">
            {isMe ? t('eyebrowMe') : t('eyebrowOther')}
          </p>

          {editing ? (
            <div className="flex flex-col gap-3 max-w-md">
              <input
                ref={inputRef}
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                maxLength={30}
                placeholder={t('editUsernamePlaceholder')}
                className="bg-surface-2 border border-line rounded-lg px-4 py-2 font-display font-extrabold text-2xl text-foreground focus:outline-none focus:border-neon"
              />
              <textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                maxLength={280}
                rows={2}
                placeholder={t('editBioPlaceholder')}
                className="bg-surface-2 border border-line rounded-lg px-4 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-neon"
              />
              {editError && (
                <p className="text-xs text-destructive font-bold">{editError}</p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="px-5 py-2 rounded-lg bg-neon text-primary-foreground text-xs font-display font-bold uppercase tracking-[0.15em] disabled:opacity-50"
                >
                  {editSaving ? t('editSaving') : t('editSave')}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-5 py-2 rounded-lg border border-line text-xs font-display font-bold uppercase tracking-[0.15em] text-ink-muted"
                >
                  {t('editCancel')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <h1 className="font-display font-extrabold text-foreground text-[clamp(2.5rem,6vw,4rem)] tracking-[-0.03em] leading-[0.95]">
                  {displayName}
                </h1>
                {isMe && (
                  <button
                    onClick={openEdit}
                    aria-label={t('editProfileLabel')}
                    className="mt-2 text-ink-dim hover:text-neon transition-colors"
                  >
                    <Pencil className="size-5" />
                  </button>
                )}
              </div>
              {user.bio && (
                <p className="text-sm text-ink-muted mt-3 max-w-xl">{user.bio}</p>
              )}
            </>
          )}

          <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-ink-dim mt-4">
            {t('memberSince', { date: memberSince })}
          </p>
        </div>
      </header>

      {userStats ? (
        <section className="mb-10">
          <h2 className="font-display font-extrabold text-xl text-foreground mb-4 tracking-tight">
            {t('statsTitle')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Trophy}
              label={t('stats.globalPosition')}
              value={rankingEntry ? `#${rankingEntry.position}` : '—'}
              highlight
              hint={
                rankingEntry
                  ? t('stats.globalPositionHintPoints', { points: rankingEntry.total })
                  : t('stats.globalPositionHintNone')
              }
            />
            <StatCard
              icon={Target}
              label={t('stats.hits')}
              value={`${userStats.hitRate}%`}
              hint={`${userStats.hits}/${userStats.settledPredictions}`}
            />
            <StatCard
              icon={Sparkles}
              label={t('stats.exactScores')}
              value={userStats.exactScores}
              hint={t('stats.exactScoresHint')}
            />
            <StatCard
              icon={Flame}
              label={t('stats.captain')}
              value={`${userStats.captain.hitRate}%`}
              hint={t('stats.captainHint', {
                hits: userStats.captain.hits,
                played: userStats.captain.played,
              })}
            />
          </div>

          {userStats.bestFixture && (
            <Card className="bg-linear-to-br from-neon/10 to-surface-1 border-neon/40 mt-4">
              <CardContent className="p-5 flex items-center gap-4">
                <TrendingUp className="size-8 text-neon shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-display font-bold text-neon mb-1">
                    {t('bestFixture.label')}
                  </p>
                  <p className="font-display font-extrabold text-foreground">
                    {userStats.bestFixture.name}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {t('bestFixture.summary', {
                      hits: userStats.bestFixture.hits,
                      matches: userStats.bestFixture.matches,
                    })}
                  </p>
                </div>
                <p className="font-display font-extrabold text-4xl text-neon tabular-nums">
                  {userStats.bestFixture.total}
                  <span className="text-xs text-ink-dim font-normal ml-1">
                    {t('bestFixture.points')}
                  </span>
                </p>
              </CardContent>
            </Card>
          )}
        </section>
      ) : (
        <Empty className="mb-10">
          <EmptyHeader>
            <EmptyTitle>{t('noStatsTitle')}</EmptyTitle>
            <EmptyDescription>
              {t('noStatsDesc')}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {isMe && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-extrabold text-xl text-foreground tracking-tight">
              {t('achievementsTitle')}
            </h2>
            {achievements.length > 0 && (
              <Badge variant="outline" className="font-display tracking-wider">
                {achievements.filter((a) => a.unlocked).length}/{achievements.length}
              </Badge>
            )}
          </div>
          {achievements.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>{t('noAchievementsTitle')}</EmptyTitle>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {achievements.map((a) => (
                <AchievementCard key={a.id} achievement={a} />
              ))}
            </div>
          )}
        </section>
      )}

      <div className="mt-12 flex gap-3 flex-wrap">
        <Link
          href="/ranking"
          className="text-xs font-display font-bold uppercase tracking-[0.18em] text-neon hover:underline"
        >
          {t('links.ranking')}
        </Link>
        {isMe && (
          <Link
            href="/mis-pronosticos"
            className="text-xs font-display font-bold uppercase tracking-[0.18em] text-ink-muted hover:text-neon"
          >
            {t('links.myPredictions')}
          </Link>
        )}
        <Link
          href="/prode"
          className="text-xs font-display font-bold uppercase tracking-[0.18em] text-ink-muted hover:text-neon"
        >
          {t('links.predict')}
        </Link>
      </div>
    </main>
  );
}
