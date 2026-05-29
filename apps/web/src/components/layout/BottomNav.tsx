'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { NAV_ITEMS, isNavItemActive } from '@/lib/navigation';

/**
 * Tab bar inferior visible solo en mobile (md:hidden).
 * Render condicional: solo cuando el usuario está autenticado y la ruta
 * no es auth/admin (donde no aplica).
 */
export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { status } = useSession();

  if (status !== 'authenticated') return null;
  if (pathname.startsWith('/auth')) return null;
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav
      aria-label={t('landmarks.bottom')}
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/85 backdrop-blur-xl border-t border-line/40 pb-safe"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5',
                  active ? 'text-neon' : 'text-ink-muted',
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-display font-bold uppercase tracking-widest">
                  {t(`links.${item.labelKey}`)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
