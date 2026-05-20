import { redirect } from 'next/navigation';
import { tournamentApi } from '@/lib/server-endpoints';

/**
 * Atajo `/mundial` → redirige al torneo activo (Mundial 2026 si está sembrado).
 * Permite linkear desde el Navbar sin hardcodear el id.
 *
 * `redirect()` lanza NEXT_REDIRECT; no envolver en try/catch.
 */
export default async function MundialPage() {
  const active = await tournamentApi.active().catch(() => null);
  redirect(active ? `/torneo/${active.id}` : '/home');
}
