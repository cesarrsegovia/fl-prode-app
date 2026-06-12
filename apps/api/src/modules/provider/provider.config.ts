export interface ProviderConfig {
  name: string;
  operatorName: string;
  baseUrl: string;
  apiKey: string;
  /** Si está desactivado, las llamadas outbound se saltean (útil en dev sin padre). */
  enabled: boolean;
  /** ms timeout para las llamadas HTTP al padre */
  timeoutMs: number;
}

export function loadProviderConfig(): ProviderConfig {
  const name = (process.env.PROVIDER_NAME || 'prode').trim();
  const operatorName = (process.env.PROVIDER_OPERATOR_NAME || '').trim();
  const baseUrl = (process.env.OFFCHAIN_API_URL || process.env.PROVIDER_BASE_URL || '').trim();
  const apiKey = (process.env.PROVIDER_OUTBOUND_API_KEY || '').trim();
  const timeoutMs = parseInt(process.env.PROVIDER_TIMEOUT_MS || '10000', 10);

  // La API key es opcional: el casino puede no exigirla en sus endpoints.
  // Si está presente, se envía igual (header X-API-Key); si no, no bloquea.
  const enabled = Boolean(baseUrl && operatorName);
  if (!enabled) {
    console.warn(
      '[provider] integración deshabilitada — faltan OFFCHAIN_API_URL u PROVIDER_OPERATOR_NAME',
    );
  }

  return {
    name,
    operatorName,
    baseUrl,
    apiKey,
    enabled,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10000,
  };
}

export const PROVIDER_CONFIG = Symbol('PROVIDER_CONFIG');
