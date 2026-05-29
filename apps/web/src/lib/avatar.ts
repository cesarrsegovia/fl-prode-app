/** Iniciales de un nombre para fallback de avatar. */
export function getInitials(name?: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Retrato ilustrado de DiceBear "personas" (gratis, sin auth).
 * Fondo dorado de marca.
 */
export function diceBearAvatar(seed: string): string {
  const safe = encodeURIComponent(seed.trim().toLowerCase() || 'prode');
  return `https://api.dicebear.com/9.x/personas/svg?seed=${safe}&backgroundColor=e9ac36,c79a2e,f4d69c&radius=50`;
}
