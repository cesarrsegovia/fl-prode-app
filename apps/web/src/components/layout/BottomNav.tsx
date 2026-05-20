'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  ListChecks,
  Users,
  Trophy,
  ClipboardList,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/home', label: 'Inicio', icon: Home, match: (p: string) => p === '/home' || p === '/' },
  { href: '/prode', label: 'Prode', icon: ClipboardList, match: (p: string) => p.startsWith('/prode') },
  { href: '/mundial', label: 'Mundial', icon: Trophy, match: (p: string) => p.startsWith('/mundial') || p.startsWith('/torneo') },
  { href: '/grupos', label: 'Grupos', icon: Users, match: (p: string) => p.startsWith('/grupos') },
  { href: '/ranking', label: 'Ranking', icon: ListChecks, match: (p: string) => p.startsWith('/ranking') },
];

/**
 * Tab bar inferior visible solo en mobile (md:hidden).
 * Render condicional: solo cuando el usuario está autenticado y la ruta
 * no es auth/admin (donde no aplica).
 */
export function BottomNav() {
  const pathname = usePathname();
  const { status } = useSession();

  if (status !== 'authenticated') return null;
  if (pathname.startsWith('/auth')) return null;
  if (pathname.startsWith('/admin')) return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-background/85 backdrop-blur-xl border-t border-line/40">
      <ul className="grid grid-cols-5">
        {NAV.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 py-2.5',
                  active ? 'text-neon' : 'text-ink-muted',
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-display font-bold uppercase tracking-widest">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
