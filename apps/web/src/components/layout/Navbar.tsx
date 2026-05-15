'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';

function getInitials(name?: string | null) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarUrlFor(seed: string) {
  // DiceBear "personas" — retratos ilustrados estilo Notion/Linear, gratis y sin auth.
  // El seed garantiza que el mismo usuario siempre tenga el mismo personaje.
  const safe = encodeURIComponent(seed.trim().toLowerCase() || 'prode');
  return `https://api.dicebear.com/9.x/personas/svg?seed=${safe}&backgroundColor=b6f23d,45fc9b,1de9b6&radius=50`;
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const isAuthed = status === 'authenticated';

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface-container-highest/60 backdrop-blur-xl flex justify-between items-center h-16 px-6 shadow-[0_8px_32px_rgba(0,223,129,0.06)]">
      <div className="flex items-center gap-8">
        <Link
          href={isAuthed ? '/home' : '/'}
          className="text-2xl font-black italic text-white flex items-center whitespace-nowrap font-headline"
        >
          Prode<span className="text-primary text-4xl leading-0 ml-0.5">.</span>
        </Link>

        <div className="hidden md:flex gap-6">
          <Link
            href={isAuthed ? '/home' : '/'}
            className={cn(
              'font-headline font-bold tracking-tight transition-colors duration-200',
              pathname === '/' || pathname === '/home'
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-muted-foreground hover:text-primary',
            )}
          >
            Inicio
          </Link>
          <Link
            href="/prode"
            className={cn(
              'font-headline font-bold tracking-tight transition-colors duration-200',
              pathname.startsWith('/prode')
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-muted-foreground hover:text-primary',
            )}
          >
            Mi Prode
          </Link>
          <Link
            href="/grupos"
            className={cn(
              'font-headline font-bold tracking-tight transition-colors duration-200',
              pathname.startsWith('/grupos')
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-muted-foreground hover:text-primary',
            )}
          >
            Grupos
          </Link>
          <Link
            href="/ranking"
            className={cn(
              'font-headline font-bold tracking-tight transition-colors duration-200',
              pathname.startsWith('/ranking')
                ? 'text-primary border-b-2 border-primary pb-1'
                : 'text-muted-foreground hover:text-primary',
            )}
          >
            Ranking
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {status === 'loading' ? (
          <div className="w-24 h-8 rounded animate-pulse bg-white/5" />
        ) : isAuthed ? (
          <AuthedActions
            name={session?.user?.name ?? session?.user?.email ?? 'Yo'}
            email={session?.user?.email ?? ''}
            userId={(session?.user as { id?: string } | undefined)?.id}
            image={session?.user?.image ?? null}
          />
        ) : (
          <>
            <Link href="/auth">
              <Button
                variant="ghost"
                className="text-sm font-bold text-white hover:bg-white/5 active:scale-95 transition-all"
              >
                Ingresar
              </Button>
            </Link>
            <Link href="/auth">
              <Button className="text-sm font-bold active:scale-95 transition-all">
                Registrate
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
  const { unreadCount, markRead } = useNotifications();
  const [menuOpen, setMenuOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
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
  const avatarSrc = image || avatarUrlFor(email || name);

  return (
    <>
      <button
        onClick={markRead}
        className="relative w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-white/5 transition-colors"
        aria-label="Notificaciones"
        title={unreadCount ? `${unreadCount} nuevas` : 'Sin notificaciones nuevas'}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-black text-[10px] font-black flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-1 py-1 rounded-full hover:bg-white/5 transition-colors"
        >
          {imgError ? (
            <span
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-black bg-primary ring-2 ring-transparent hover:ring-primary/50 transition-all"
              aria-hidden="true"
            >
              {initials}
            </span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrc}
              alt={name}
              onError={() => setImgError(true)}
              className="w-9 h-9 rounded-full object-cover bg-surface-container-highest ring-2 ring-transparent hover:ring-primary/50 transition-all"
            />
          )}
          <span className="hidden md:block text-sm font-bold text-white pr-2">
            {name}
          </span>
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 mt-2 w-48 rounded-xl border border-white/5 shadow-2xl overflow-hidden"
            style={{ background: 'var(--surface-container-highest)' }}
          >
            {userId && (
              <Link
                href={`/perfil/${userId}`}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors"
              >
                Mi perfil
              </Link>
            )}
            <button
              onClick={() => {
                setMenuOpen(false);
                signOut({ callbackUrl: '/' });
              }}
              className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-white/5 transition-colors border-t border-white/5"
            >
              Salir
            </button>
          </div>
        )}
      </div>
    </>
  );
}
