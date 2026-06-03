'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onParentMessage, postToParent, EVENTS } from '@/lib/bridge';
import { useIsEmbedded } from '@/hooks/useEmbed';
import { signIn } from '@/lib/session';

/**
 * Monta el puente postMessage cuando la app está embebida:
 *  - emite `prode:ready` y `prode:resize` (ResizeObserver)
 *  - escucha `casino:auth` (canjea authorizationCode) y `casino:back`
 */
export function BridgeProvider({ children }: { children: React.ReactNode }) {
  const embedded = useIsEmbedded();
  const router = useRouter();

  useEffect(() => {
    if (!embedded) return;

    postToParent(EVENTS.READY);

    const off = onParentMessage((msg) => {
      if (msg.type === EVENTS.AUTH) {
        const code = msg.payload?.authorizationCode as string | undefined;
        const locale = msg.payload?.locale as string | undefined;
        if (locale) {
          document.cookie = `NEXT_LOCALE=${locale};path=/;max-age=31536000;SameSite=None;Secure`;
        }
        if (code) void signIn('provider-launch', { authorizationCode: code });
      } else if (msg.type === EVENTS.BACK) {
        router.back();
      }
    });

    const emitResize = () =>
      postToParent(EVENTS.RESIZE, { height: document.body.scrollHeight });
    const ro = new ResizeObserver(() => requestAnimationFrame(emitResize));
    ro.observe(document.body);
    emitResize();

    return () => {
      off();
      ro.disconnect();
    };
  }, [embedded, router]);

  return <>{children}</>;
}
