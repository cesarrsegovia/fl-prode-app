import 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    user: {
      id: string;
      username: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  }

  interface User {
    accessToken?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string;
    userId?: string;
    username?: string;
  }
}
