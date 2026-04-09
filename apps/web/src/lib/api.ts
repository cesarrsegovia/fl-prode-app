import axios from 'axios';

// Singleton instance for client-side queries
export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure interceptors for token injection if needed through next-auth
apiClient.interceptors.request.use(
  (config) => {
    // You can inject session tokens here on client side, example:
    // const session = await getSession();
    // if (session?.token) config.headers.Authorization = `Bearer ${session.token}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
