import type { AuthSession } from '@/store/auth';

export type { AuthSession };

export interface ApiAuthResponse {
  accessToken: string;
  user: { id: string; email?: string | null; username?: string | null; isAdmin?: boolean };
}

/** Mapea la respuesta de /auth/login | /auth/provider-exchange a la sesión interna. */
export function toSession(data: ApiAuthResponse): AuthSession {
  const username = data.user.username ?? data.user.id;
  return {
    accessToken: data.accessToken,
    user: {
      id: data.user.id,
      username,
      isAdmin: !!data.user.isAdmin,
      email: data.user.email ?? null,
      name: username,
      image: null,
    },
  };
}
