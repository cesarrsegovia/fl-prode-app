import { useTranslations } from 'next-intl';
import type { NotificationDto } from '@/lib/endpoints';

/**
 * Devuelve una función que traduce una notificación a texto legible.
 * Si la notificación trae `payload.key`, traduce esa clave i18n con sus params
 * (frases variadas en los 4 idiomas). Si no, cae al `message` que envía el
 * backend (fallback en español / notificaciones legacy).
 */
export function useNotificationText() {
  const t = useTranslations('notificaciones.messages');

  return (n: Pick<NotificationDto, 'message' | 'payload'>): string => {
    const key = n.payload?.key;
    if (!key) return n.message;
    try {
      return t(key, n.payload?.params ?? {});
    } catch {
      // Clave desconocida (p. ej. notificación más nueva que el bundle): fallback.
      return n.message;
    }
  };
}
