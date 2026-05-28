import { getRequestConfig } from 'next-intl/server';
import { getUserLocale } from './locale';

/**
 * Resolver server-side de mensajes por request. El locale se obtiene de la
 * cookie / Accept-Language (no de la URL). Los catálogos se cargan por
 * namespace y se combinan; `en` es la fuente de verdad.
 */
const namespaces = [
  'common',
  'nav',
  'auth',
  'landing',
  'home',
  'prode',
  'grupos',
  'ranking',
  'notificaciones',
  'mis-pronosticos',
  'torneo',
  'seleccion',
  'partido',
  'perfil',
  'admin',
  'faq',
] as const;

export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  const messages = Object.assign(
    {},
    ...(await Promise.all(
      namespaces.map(async (ns) => ({
        [ns]: (await import(`../messages/${locale}/${ns}.json`)).default,
      })),
    )),
  );

  return {
    locale,
    messages,
    // Zona horaria por defecto para formateo consistente entre SSR y cliente
    // (evita hydration mismatch). TODO: detección por usuario — leer la tz del
    // navegador y persistirla en cookie para mostrar horarios en hora local.
    timeZone: 'America/Argentina/Buenos_Aires',
  };
});
