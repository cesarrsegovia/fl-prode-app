'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFormatter, useTranslations } from 'next-intl';
import { Loader2, Search, ShieldCheck, ShieldOff } from 'lucide-react';
import { admin, type AdminUserItem } from '@/lib/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';

export default function AdminUsuariosPage() {
  const t = useTranslations('admin.users');
  const tc = useTranslations('admin.common');
  const format = useFormatter();
  const { data: session } = useSession();
  const myUserId = (session?.user as { id?: string } | undefined)?.id;

  const [items, setItems] = useState<AdminUserItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await admin.users({ search: debounced || undefined });
      setItems(res.items);
      setNextCursor(res.nextCursor);
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(m ?? t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [debounced]);

  useEffect(() => {
    load();
  }, [load]);

  const loadMore = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await admin.users({ search: debounced || undefined, cursor: nextCursor });
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleAdmin = async (u: AdminUserItem) => {
    if (u.id === myUserId && u.isAdmin) {
      alert(t('selfDemoteError'));
      return;
    }
    const next = !u.isAdmin;
    setTogglingId(u.id);
    try {
      await admin.setUserAdmin(u.id, next);
      setItems((prev) => prev.map((it) => (it.id === u.id ? { ...it, isAdmin: next } : it)));
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(m ?? t('updateError'));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div>
      <p className="font-display text-sm text-ink-muted mb-6">
        {t('subtitle')}
      </p>

      <div className="relative mb-6 max-w-md">
        <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-dim pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-9 pr-3 h-10 bg-surface-1 border border-line rounded-full text-sm font-display text-foreground placeholder:text-ink-dim focus:outline-none focus:border-neon"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive font-bold">{error}</p>
      ) : !items.length ? (
        <p className="text-sm text-ink-muted">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((u) => (
            <Card key={u.id} className="bg-surface-1 border-line">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <UserAvatar name={u.username} image={u.avatarUrl} size="default" />
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm text-foreground truncate">
                      {u.username}
                      {u.id === myUserId && (
                        <Badge variant="outline" className="ml-2 text-[10px]">
                          {t('you')}
                        </Badge>
                      )}
                    </p>
                    <p className="text-xs text-ink-muted truncate">{u.email}</p>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim">
                  <span>{t('preds', { count: u._count.predictions })}</span>
                  <span>{t('groups', { count: u._count.memberships })}</span>
                  <span>{t('since', { date: format.dateTime(new Date(u.createdAt), { day: '2-digit', month: 'short', year: 'numeric' }) })}</span>
                </div>

                <button
                  onClick={() => toggleAdmin(u)}
                  disabled={togglingId === u.id}
                  className={cn(
                    'h-9 px-3 rounded font-display font-extrabold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 transition-all',
                    u.isAdmin
                      ? 'bg-neon text-primary-foreground hover:opacity-80'
                      : 'bg-surface-2 text-ink-muted hover:text-foreground hover:bg-surface-3',
                  )}
                >
                  {togglingId === u.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : u.isAdmin ? (
                    <>
                      <ShieldCheck className="size-3" /> {t('admin')}
                    </>
                  ) : (
                    <>
                      <ShieldOff className="size-3" /> {t('member')}
                    </>
                  )}
                </button>
              </CardContent>
            </Card>
          ))}

          {nextCursor && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-4 h-10 rounded-full bg-surface-1 border border-line text-xs font-display font-bold uppercase tracking-[0.15em] text-ink-muted hover:text-foreground hover:bg-surface-2 disabled:opacity-50"
            >
              {loadingMore ? tc('loadingMore') : tc('loadMore')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
