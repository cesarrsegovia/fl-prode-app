'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { useGroupChat } from '@/hooks/useGroupChat';
import type { ChatMessage } from '@/lib/endpoints';

type Grouped = { day: string; items: ChatMessage[] };

export function Chat({
  groupId,
  myUserId,
}: {
  groupId: string;
  myUserId: string | undefined;
}) {
  const t = useTranslations('grupos.chat');
  const format = useFormatter();
  const { items, isLoading, error, send, sending } = useGroupChat(groupId);
  const [draft, setDraft] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIdRef = useRef<string | null>(null);

  const formatTime = (iso: string) =>
    format.dateTime(new Date(iso), { hour: '2-digit', minute: '2-digit' });

  const formatDay = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return t('today');
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return t('yesterday');
    return format.dateTime(d, { day: '2-digit', month: 'short' });
  };

  const grouped: Grouped[] = useMemo(() => {
    const acc: Grouped[] = [];
    for (const m of items) {
      const day = formatDay(m.createdAt);
      const last = acc[acc.length - 1];
      if (!last || last.day !== day) acc.push({ day, items: [m] });
      else last.items.push(m);
    }
    return acc;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    const last = items[items.length - 1];
    if (!last) return;
    if (lastIdRef.current === last.id) return;
    lastIdRef.current = last.id;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft;
    setDraft('');
    await send(text);
  };

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ background: 'var(--surface-container-low)', height: '70vh' }}
    >
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-10 rounded-xl animate-pulse"
                style={{ background: 'var(--surface-container-highest)' }}
              />
            ))}
          </div>
        )}

        {!isLoading && !items.length && (
          <div className="text-center pt-12">
            <p className="text-sm text-on-surface-variant">
              {t('emptyTitle')}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {t('emptyDesc')}
            </p>
          </div>
        )}

        {grouped.map((g) => (
          <div key={g.day} className="space-y-2">
            <div className="flex justify-center">
              <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant px-3 py-1 rounded-full" style={{ background: 'var(--surface-container-highest)' }}>
                {g.day}
              </span>
            </div>
            {g.items.map((m) => {
              const mine = m.userId === myUserId;
              return (
                <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[78%] px-3 py-2 rounded-2xl ${mine ? 'bg-primary text-black rounded-br-sm' : 'text-white rounded-bl-sm'}`}
                    style={!mine ? { background: 'var(--surface-container-highest)' } : undefined}
                  >
                    {!mine && (
                      <p className="text-[11px] font-bold opacity-80 mb-0.5">
                        {m.user.username}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap wrap-break-word leading-snug">
                      {m.content}
                    </p>
                    <p className={`text-[10px] mt-0.5 ${mine ? 'text-black/60' : 'opacity-60'}`}>
                      {formatTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {error && (
        <p className="text-xs text-red-400 px-4 pb-1">{error}</p>
      )}

      <form
        onSubmit={onSubmit}
        className="flex gap-2 p-3 border-t border-white/5"
        style={{ background: 'var(--surface-container)' }}
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('placeholder')}
          maxLength={2000}
          className="flex-1 bg-transparent px-3 py-2 rounded-lg text-sm text-white placeholder:text-on-surface-variant focus:outline-none"
          style={{ background: 'var(--surface-container-low)' }}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          className="bg-primary text-black text-sm font-bold px-4 rounded-lg active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
        >
          {sending ? '…' : t('send')}
        </button>
      </form>
    </div>
  );
}
