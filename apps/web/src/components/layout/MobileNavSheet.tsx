'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog';
import { useTranslations } from 'next-intl';
import { LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, useSession } from '@/lib/session';
import { NAV_ITEMS, ADMIN_NAV_ITEM, isNavItemActive } from '@/lib/navigation';

/**
 * Menú de navegación mobile (md:hidden). Se abre desde la hamburguesa del
 * Navbar y muestra las secciones como un sheet lateral. Usado en lugar de una
 * tab-bar inferior porque la app vive embebida en el casino, cuya propia barra
 * inferior tapa cualquier `fixed bottom-0` nuestro.
 */
export function MobileNavSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin === true;
  const items = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <DialogPrimitive.Popup
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex h-full w-[min(82vw,20rem)] flex-col',
            'border-l-2 border-brand bg-surface shadow-elev',
            'transition-transform duration-250 ease-out',
            'data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full',
          )}
        >
          <header className="flex items-center justify-between gap-3 px-5 h-16 border-b border-line/60">
            <DialogPrimitive.Title className="font-display font-extrabold uppercase tracking-[0.2em] text-sm text-brand">
              {t('menu.title')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label={t('menu.close')}
              className="rounded-full p-1.5 text-ink-muted hover:bg-surface-2 hover:text-foreground transition-colors"
            >
              <X size={20} />
            </DialogPrimitive.Close>
          </header>

          <nav aria-label={t('landmarks.primary')} className="flex-1 overflow-y-auto p-3">
            <ul className="flex flex-col gap-1">
              {items.map((link) => {
                const active = isNavItemActive(link, pathname);
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <DialogPrimitive.Close
                      render={
                        <Link
                          href={link.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-3 rounded-xl px-4 py-3 transition-colors',
                            active
                              ? 'bg-brand/12 text-brand'
                              : 'text-foreground hover:bg-surface-2',
                          )}
                        />
                      }
                    >
                      <Icon
                        className={cn(
                          'size-5 shrink-0',
                          active && 'drop-shadow-[0_0_10px_var(--brand)]',
                        )}
                      />
                      <span className="font-display font-bold uppercase tracking-widest text-sm">
                        {t(`links.${link.labelKey}`)}
                      </span>
                    </DialogPrimitive.Close>
                  </li>
                );
              })}
            </ul>
          </nav>

          {session ? (
            <div className="border-t border-line/60 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-ink-muted transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <LogOut className="size-5 shrink-0" />
                <span className="font-display font-bold uppercase tracking-widest text-sm">
                  {t('menu.logout')}
                </span>
              </button>
            </div>
          ) : null}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
