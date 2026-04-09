'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const pathname = usePathname();

  // Helper to determine if a path is active
  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface-container-highest/60 backdrop-blur-xl flex justify-between items-center h-16 px-6 shadow-[0_8px_32px_rgba(0,223,129,0.06)]">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-2xl font-black italic text-white flex items-center whitespace-nowrap font-headline">
          Prode<span className="text-primary text-4xl leading-[0] ml-0.5">.</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex gap-6">
          <Link 
            href="/" 
            className={cn(
              "font-headline font-bold tracking-tight transition-colors duration-200",
              pathname === '/' ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground hover:text-primary"
            )}
          >
            Inicio
          </Link>
          <Link 
            href="/prode" 
            className={cn(
              "font-headline font-bold tracking-tight transition-colors duration-200",
              pathname.startsWith('/prode') ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground hover:text-primary"
            )}
          >
            Mi Prode
          </Link>
          <Link 
            href="/grupos" 
            className={cn(
              "font-headline font-bold tracking-tight transition-colors duration-200",
              pathname.startsWith('/grupos') ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground hover:text-primary"
            )}
          >
            Grupos
          </Link>
          <Link 
            href="/ranking" 
            className={cn(
              "font-headline font-bold tracking-tight transition-colors duration-200",
              pathname.startsWith('/ranking') ? "text-primary border-b-2 border-primary pb-1" : "text-muted-foreground hover:text-primary"
            )}
          >
            Ranking
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Placeholder for Auth: Currently showing Ingresar/Registrarse for all until Auth is ready */}
        <Button variant="ghost" className="text-sm font-bold text-white hover:bg-white/5 active:scale-95 transition-all">
          Ingresar
        </Button>
        <Button className="text-sm font-bold active:scale-95 transition-all">
          Registrate
        </Button>
      </div>
    </nav>
  );
}
