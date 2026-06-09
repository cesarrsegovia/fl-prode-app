'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from '@/lib/session';
import { useTranslations } from 'next-intl';
import { HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
      className="fixed top-0 inset-x-0 z-50 h-16 px-4 md:px-6 flex items-center justify-end bg-surface/90 backdrop-blur-xl border-b-2 border-brand"
    >
      {/* Pestañas centradas (ícono + label), estilo glow dorado. */}
      <div className="absolute inset-x-0 hidden md:flex justify-center pointer-events-none">
        <ul className="flex items-center gap-2 pointer-events-auto">
          {navItems.map((link) => {
            const active = isNavItemActive(link, pathname);
            const Icon = link.icon;
            // Para invitados, "Home" apunta a la landing pública "/" (las rutas
            // bajo (main) están protegidas y redirigen a /auth).
            const href =
              !isAuthed && link.labelKey === 'home' ? '/' : link.href;
            return (
              <li key={link.href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors',
                    active
                      ? 'text-brand'
                      : 'text-ink-muted hover:text-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-5 transition-[filter,opacity]',
                      active
                        ? 'drop-shadow-[0_0_10px_var(--brand)]'
                        : 'opacity-90 group-hover:opacity-100',
                    )}
                  />
                  <span className="text-[11px] font-display font-bold uppercase tracking-widest">
                    {t(`links.${link.labelKey}`)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
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
        {isAuthed ? (
          <AuthedActions
            name={session?.user?.name ?? session?.user?.email ?? t('menu.fallbackName')}
            email={session?.user?.email ?? ''}
            userId={(session?.user as { id?: string } | undefined)?.id}
            image={session?.user?.image ?? null}
          />
        ) : null}
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

  const initials = getInitials(name);
  const avatarSrc = image || diceBearAvatar(email || name);

  return (
    <>
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
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
            {t('menu.logout')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
