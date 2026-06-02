'use client';

import { useState } from 'react';
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
import { getInitials, diceBearAvatar } from '@/lib/avatar';
import { NAV_ITEMS, ADMIN_NAV_ITEM, isNavItemActive } from '@/lib/navigation';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';
  const isAdmin = session?.user?.isAdmin === true;
  const [faqOpen, setFaqOpen] = useState(false);
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <nav
      aria-label={t('landmarks.primary')}
      className="fixed top-0 inset-x-0 z-50 h-16 px-4 md:px-6 flex justify-between items-center bg-background/70 backdrop-blur-xl border-b border-line/40"
    >
      <div className="flex items-center gap-10">
        <Link
          href={isAuthed ? '/home' : '/'}
          className="flex items-baseline gap-0 font-display font-extrabold text-2xl tracking-tight"
        >
          <span className="text-foreground">Prode</span>
          <span className="text-neon text-3xl leading-none">.</span>
        </Link>

        <div className="hidden md:flex gap-6">
          {navItems.map((link) => {
            const active = isNavItemActive(link, pathname);
            // Para invitados, "Home" apunta a la landing pública "/" (las rutas
            // bajo (main) están protegidas y redirigen a /auth). Igual que el logo.
            const href =
              !isAuthed && link.labelKey === 'home' ? '/' : link.href;
            return (
              <Link
                key={link.href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'font-display font-semibold text-sm tracking-tight transition-colors',
                  active ? 'text-neon' : 'text-ink-muted hover:text-foreground',
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

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={name}
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
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {userId && (
            <DropdownMenuItem render={<Link href={`/perfil/${userId}`} />}>
              {t('menu.profile')}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem render={<Link href="/mis-pronosticos" />}>
            {t('menu.myPredictions')}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/notificaciones" />}>
            {t('menu.notifications')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
            {t('menu.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
