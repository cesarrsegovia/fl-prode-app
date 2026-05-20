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
  const baseUrl = (process.env.PROVIDER_BASE_URL || '').trim();
  const apiKey = (process.env.PROVIDER_OUTBOUND_API_KEY || '').trim();
  const timeoutMs = parseInt(process.env.PROVIDER_TIMEOUT_MS || '10000', 10);

  const enabled = Boolean(baseUrl && apiKey && operatorName);
  if (!enabled) {
    console.warn(
      '[provider] integración deshabilitada — faltan PROVIDER_BASE_URL, PROVIDER_OUTBOUND_API_KEY u PROVIDER_OPERATOR_NAME',
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
