/**
 * Construye el link público de invitación a un grupo.
 *
 * Prioriza el dominio canónico (`NEXT_PUBLIC_APP_URL`) para evitar exponer la
 * URL del deploy de Vercel. Si no está configurado, cae al origin del navegador
 * (útil en desarrollo local).
 */
export function buildInviteUrl(
  inviteCode: string,
  opts: { appUrl?: string; origin: string },
): string {
  const canonical = opts.appUrl?.trim();
  const base = (canonical || opts.origin).replace(/\/+$/, '');
  return `${base}/invitacion/${inviteCode}`;
}
