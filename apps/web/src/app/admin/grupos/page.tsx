'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { Loader2, Search, Trash2, Lock, Globe } from 'lucide-react';
import { admin, type AdminGroupItem } from '@/lib/endpoints';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function AdminGruposPage() {
  const t = useTranslations('admin.groups');
  const tc = useTranslations('admin.common');
  const format = useFormatter();
  const [items, setItems] = useState<AdminGroupItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await admin.groups({ search: debounced || undefined });
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
      const res = await admin.groups({ search: debounced || undefined, cursor: nextCursor });
      setItems((prev) => [...prev, ...res.items]);
      setNextCursor(res.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  };

  const deleteGroup = async (g: AdminGroupItem) => {
    if (!confirm(t('confirmDelete', { name: g.name }))) return;
    setDeletingId(g.id);
    try {
      await admin.deleteGroup(g.id);
      setItems((prev) => prev.filter((it) => it.id !== g.id));
    } catch (e: unknown) {
      const m = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      alert(m ?? t('deleteError'));
    } finally {
      setDeletingId(null);
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
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : error ? (
        <p className="text-sm text-destructive font-bold">{error}</p>
      ) : !items.length ? (
        <p className="text-sm text-ink-muted">{t('empty')}</p>
      ) : (
        <div className="space-y-2">
          {items.map((g) => (
            <Card key={g.id} className="bg-surface-1 border-line">
              <CardContent className="p-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/grupos/${g.id}`}
                      className="font-display font-bold text-sm text-foreground hover:text-neon truncate"
                    >
                      {g.name}
                    </Link>
                    {g.isPrivate ? (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Lock className="size-2.5" /> {t('private')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Globe className="size-2.5" /> {t('public')}
                      </Badge>
                    )}
                  </div>
                  {g.description && (
                    <p className="text-xs text-ink-muted mt-0.5 truncate">{g.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.18em] font-display font-bold text-ink-dim">
                  <span>{t('members', { count: g._count.members })}</span>
                  <span>{t('messages', { count: g._count.messages })}</span>
                  <span>{t('events', { count: g._count.activities })}</span>
                  <span>{format.dateTime(new Date(g.createdAt), { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>

                <button
                  onClick={() => deleteGroup(g)}
                  disabled={deletingId === g.id}
                  className="h-9 px-3 rounded font-display font-extrabold text-xs uppercase tracking-[0.15em] flex items-center gap-1.5 bg-destructive/10 text-destructive hover:bg-destructive/20 disabled:opacity-50"
                >
                  {deletingId === g.id ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="size-3" /> {t('delete')}
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
