'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const ADMIN_TABS = [
  { href: '/admin/partidos', key: 'partidos' },
  { href: '/admin/torneos', key: 'torneos' },
  { href: '/admin/usuarios', key: 'usuarios' },
  { href: '/admin/grupos', key: 'grupos' },
] as const;

/**
 * Layout admin: guard de `isAdmin` + barra de navegación interna.
 * Si no es admin, redirige a /home.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('admin');
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = session?.user?.isAdmin === true;

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth');
    else if (status === 'authenticated' && !isAdmin) router.replace('/home');
  }, [status, isAdmin, router]);

  if (status === 'loading' || !isAdmin) {
    return (
      <div className="pt-28 px-6 max-w-5xl mx-auto">
        <div className="h-64 rounded-2xl animate-pulse bg-surface-1" />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-24 px-6 max-w-6xl mx-auto">
      <header className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="size-4 text-neon" />
            <span className="font-display text-xs uppercase tracking-[0.3em] text-neon">
              {t('eyebrow')}
            </span>
          </div>
          <h1 className="font-display font-extrabold text-foreground tracking-[-0.03em] text-4xl leading-none">
            {t('panel')}
          </h1>
        </div>
        <nav className="flex gap-1 bg-surface-1 rounded-full p-1 border border-line">
          {ADMIN_TABS.map((tab) => {
            const active = pathname?.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'px-4 py-2 rounded-full text-xs font-display font-bold uppercase tracking-[0.15em] transition-colors',
                  active
                    ? 'bg-neon text-primary-foreground'
                    : 'text-foreground hover:bg-surface-2',
                )}
              >
                {t(`tabs.${tab.key}`)}
              </Link>
            );
          })}
        </nav>
      </header>
      {children}
    </div>
  );
}
