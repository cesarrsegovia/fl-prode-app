import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { isTokenExpired } from '@/lib/jwt';

export interface AuthUser {
  id: string;
  username: string;
  isAdmin: boolean;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface AuthSession {
  accessToken: string;
  user: AuthUser;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  session: AuthSession | null;
  hydrated: boolean;
  setSession: (session: AuthSession | null) => void;
  clear: () => void;
  setHydrated: () => void;
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};
const storage = createJSONStorage<{ session: AuthSession | null }>(() =>
  typeof window !== 'undefined' ? window.sessionStorage : noopStorage,
);

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      hydrated: false,
      setSession: (session) => set({ session }),
      clear: () => set({ session: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'prode.auth',
      storage,
      partialize: (s) => ({ session: s.session }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Token vigente o null (no-React, seguro para importar en el cliente axios). */
export function getValidToken(): string | null {
  const session = useAuthStore.getState().session;
  if (!session) return null;
  if (isTokenExpired(session.accessToken, Date.now())) return null;
  return session.accessToken;
}
