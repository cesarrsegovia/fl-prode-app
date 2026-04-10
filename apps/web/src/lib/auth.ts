import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          if (!res.ok) return null;

          const data = await res.json();
          // data = { accessToken, user: { id, email, username } }

          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.username,
            accessToken: data.accessToken,
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth',
  },
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, persist the backend accessToken and user info
      if (user) {
        token.accessToken = user.accessToken;
        token.userId = user.id;
        token.username = user.name ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        user: {
          ...session.user,
          id: token.userId as string,
          username: token.username as string,
        },
      };
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-me',
};
