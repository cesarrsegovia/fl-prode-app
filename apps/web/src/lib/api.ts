import axios from 'axios';
import { getValidToken, useAuthStore } from '@/store/auth';
import { requestReauth } from '@/lib/bridge';

// Singleton para queries del lado cliente.
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api',
  // Sin cookies: la sesión viaja como Bearer (ver interceptor). El diseño embebido
  // es cookieless, así que no enviamos credenciales cross-origin.
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inyecta el JWT (del store) en cada request.
apiClient.interceptors.request.use(
  (config) => {
    const token = getValidToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// En 401: limpiar sesión y, si estamos embebidos, pedir code fresco al casino.
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error?.response?.status === 401) {
      useAuthStore.getState().clear();
      requestReauth();
    }
    return Promise.reject(error);
  },
);

// Helper server-side (RSC / Server Actions) — sin auth, igual que antes.
export async function serverFetch(path: string, options?: RequestInit) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}
