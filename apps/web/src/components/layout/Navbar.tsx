'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { Bell, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNotifications } from '@/hooks/useNotifications';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { FaqModal } from '@/components/common/FaqModal';

function getInitials(name?: string | null) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// DiceBear "personas": retratos ilustrados, gratis y sin auth.
function diceBearAvatar(seed: string) {
  const safe = encodeURIComponent(seed.trim().toLowerCase() || 'prode');
  return `https://api.dicebear.com/9.x/personas/svg?seed=${safe}&backgroundColor=b6f23d,45fc9b,1de9b6&radius=50`;
}

const NAV_LINKS = [
  { href: '/home', labelKey: 'home', match: (p: string) => p === '/' || p === '/home' },
  { href: '/prode', labelKey: 'myProde', match: (p: string) => p.startsWith('/prode') },
  { href: '/grupos', labelKey: 'groups', match: (p: string) => p.startsWith('/grupos') },
  { href: '/ranking', labelKey: 'ranking', match: (p: string) => p.startsWith('/ranking') },
  { href: '/mundial', labelKey: 'worldCup', match: (p: string) => p.startsWith('/mundial') || p.startsWith('/torneo') },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';
  const isAdmin = session?.user?.isAdmin === true;
  const [faqOpen, setFaqOpen] = useState(false);
  const navLinks = isAdmin
    ? [
        ...NAV_LINKS,
        {
          href: '/admin',
          labelKey: 'admin' as const,
          match: (p: string) => p.startsWith('/admin'),
        },
      ]
    : NAV_LINKS;

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 px-6 flex justify-between items-center bg-background/70 backdrop-blur-xl border-b border-line/40">
      <div className="flex items-center gap-10">
        <Link
          href={isAuthed ? '/home' : '/'}
          className="flex items-baseline gap-0 font-display font-extrabold text-2xl tracking-tight"
        >
          <span className="text-foreground">Prode</span>
          <span className="text-neon text-3xl leading-none">.</span>
        </Link>

        <div className="hidden md:flex gap-6">
          {navLinks.map((link) => {
            const active = link.match(pathname);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'font-display font-semibold text-sm tracking-tight transition-colors',
                  active
                    ? 'text-neon'
                    : 'text-ink-muted hover:text-foreground',
                )}
              >
                {t(`links.${link.labelKey}`)}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setFaqOpen(true)}
          aria-label={t('faqTrigger')}
          title={t('faqTrigger')}
          className="size-9 rounded-full flex items-center justify-center text-ink-muted hover:text-neon hover:bg-surface-1 transition-colors"
        >
          <HelpCircle className="size-5" />
        </button>
        <FaqModal open={faqOpen} onOpenChange={setFaqOpen} />
        <LanguageSwitcher />
        {status === 'loading' ? (
          <div className="w-24 h-8 rounded animate-pulse bg-surface-2" />
        ) : isAuthed ? (
          <AuthedActions
            name={session?.user?.name ?? session?.user?.email ?? t('menu.fallbackName')}
            email={session?.user?.email ?? ''}
            userId={(session?.user as { id?: string } | undefined)?.id}
            image={session?.user?.image ?? null}
          />
        ) : (
          <>
            <Link href="/auth">
              <Button variant="ghost" className="font-display font-semibold">
                {t('auth.login')}
              </Button>
            </Link>
            <Link href="/auth">
              <Button className="font-display font-semibold">
                {t('auth.register')}
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

function AuthedActions({
  name,
  email,
  userId,
  image,
}: {
  name: string;
  email: string;
  userId?: string;
  image?: string | null;
}) {
  const t = useTranslations('nav');
  const { unreadCount } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const initials = getInitials(name);
  const avatarSrc = image || diceBearAvatar(email || name);

  return (
    <>
      <Link
        href="/notificaciones"
        className="relative size-9 rounded-full flex items-center justify-center text-ink-muted hover:text-neon hover:bg-surface-1 transition-colors"
        aria-label={t('notifications.aria')}
        title={
          unreadCount
            ? t('notifications.count', { count: unreadCount })
            : t('notifications.none')
        }
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <Badge
            variant="default"
            className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 py-0 text-[10px] font-black"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </Badge>
        )}
      </Link>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 pr-1 py-1 rounded-full hover:bg-surface-1 transition-colors"
        >
          <Avatar size="default">
            <AvatarImage src={avatarSrc} alt={name} />
            <AvatarFallback className="bg-neon text-primary-foreground font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:block text-sm font-display font-semibold text-foreground pr-2">
            {name}
          </span>
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-xl border border-line bg-surface-2 shadow-elev overflow-hidden">
            {userId && (
              <Link
                href={`/perfil/${userId}`}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-display font-semibold text-foreground hover:bg-surface-3 transition-colors"
              >
                {t('menu.profile')}
              </Link>
            )}
            <Link
              href="/mis-pronosticos"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 text-sm font-display font-semibold text-foreground hover:bg-surface-3 transition-colors border-t border-line"
            >
              {t('menu.myPredictions')}
            </Link>
            <Link
              href="/notificaciones"
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 text-sm font-display font-semibold text-foreground hover:bg-surface-3 transition-colors border-t border-line"
            >
              {t('menu.notifications')}
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              className="w-full text-left px-4 py-3 text-sm font-display font-semibold text-foreground hover:bg-surface-3 transition-colors border-t border-line"
            >
              {t('menu.logout')}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
