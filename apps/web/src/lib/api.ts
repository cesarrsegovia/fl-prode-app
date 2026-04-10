import axios from 'axios';
import { getSession } from 'next-auth/react';

// Singleton instance for client-side queries
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Inject the NestJS JWT from NextAuth session into every request
apiClient.interceptors.request.use(
  async (config) => {
    const session = await getSession();
    if (session?.accessToken) {
      config.headers.Authorization = `Bearer ${session.accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Server-side fetch helper (for RSC / Server Actions)
// Use this inside Server Components where getSession is not available
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
