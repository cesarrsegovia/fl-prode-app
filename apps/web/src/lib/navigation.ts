import {
  Home,
  ClipboardList,
  Trophy,
  Users,
  ListChecks,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  /** Clave dentro de messages `nav.links.*`. */
  labelKey: string;
  icon: LucideIcon;
  /** Prefijos extra de ruta que también marcan este item como activo. */
  matchPrefixes: string[];
  /** Si matchea también la raíz "/". */
  matchRoot?: boolean;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: '/home', labelKey: 'home', icon: Home, matchPrefixes: ['/home'], matchRoot: true },
  { href: '/prode', labelKey: 'prode', icon: ClipboardList, matchPrefixes: ['/prode'] },
  { href: '/mundial', labelKey: 'worldCup', icon: Trophy, matchPrefixes: ['/mundial', '/torneo'] },
  { href: '/grupos', labelKey: 'groups', icon: Users, matchPrefixes: ['/grupos'] },
  { href: '/ranking', labelKey: 'ranking', icon: ListChecks, matchPrefixes: ['/ranking'] },
] as const;

export const ADMIN_NAV_ITEM = {
  href: '/admin',
  labelKey: 'admin',
  matchPrefixes: ['/admin'],
} as const;

export function isNavItemActive(
  item: { matchPrefixes: string[]; matchRoot?: boolean },
  pathname: string,
): boolean {
  if (item.matchRoot && pathname === '/') return true;
  return item.matchPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
}
