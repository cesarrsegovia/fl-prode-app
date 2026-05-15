// Compat shim — el cliente real vive en lib/api.ts (usa NextAuth).
// Mantenido para no romper imports viejos; nuevos módulos deben importar `apiClient` de lib/api.
export { apiClient as api } from './api';
