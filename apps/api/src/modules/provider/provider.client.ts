import { Inject, Injectable, Logger } from '@nestjs/common';
import axios, { type AxiosInstance, type AxiosError } from 'axios';
import {
  PROVIDER_CONFIG,
  type ProviderConfig,
} from './provider.config';
import type {
  AuthenticateRequest,
  AuthenticateResponseData,
  LaunchRequest,
  LaunchResponse,
  MoveFundsRequest,
  MoveFundsResponseData,
  ProviderEnvelope,
  ProviderErrorPayload,
} from './provider.types';

/**
 * Error tipado para fallos de comunicación o respuestas con `errors[]` del padre.
 * El service que envuelve al cliente decide cómo traducir esto al usuario final.
 */
export class ProviderClientError extends Error {
  constructor(
    message: string,
    public readonly providerErrors: ProviderErrorPayload[] | null,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'ProviderClientError';
  }
}

/**
 * Cliente HTTP outbound contra el backend padre (estilo Lucky Streak).
 * Endpoints expuestos POR EL PADRE que nosotros llamamos:
 *   - POST /games/launch
 *   - POST /providers/{provider}/authenticate
 *   - POST /providers/{provider}/moveFunds
 */
@Injectable()
export class ProviderClient {
  private readonly logger = new Logger(ProviderClient.name);
  private readonly http: AxiosInstance | null;

  constructor(
    @Inject(PROVIDER_CONFIG) private readonly config: ProviderConfig,
  ) {
    this.http = config.enabled
      ? axios.create({
          baseURL: config.baseUrl,
          timeout: config.timeoutMs,
          headers: {
            'Content-Type': 'application/json',
            // La API key es opcional; solo la mandamos si el casino la configuró.
            ...(config.apiKey ? { 'X-API-Key': config.apiKey } : {}),
          },
        })
      : null;
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  async launch(body: LaunchRequest): Promise<LaunchResponse> {
    return this.postRaw<LaunchResponse>('/games/launch', body);
  }

  async authenticate(authorizationCode: string): Promise<AuthenticateResponseData> {
    const body: AuthenticateRequest = {
      data: {
        operatorName: this.config.operatorName,
        authorizationCode,
      },
    };
    return this.postEnvelope<AuthenticateResponseData>(
      '/authenticate',
      body,
    );
  }

  async moveFunds(payload: MoveFundsRequest['data']): Promise<MoveFundsResponseData> {
    const body: MoveFundsRequest = { data: payload };
    return this.postEnvelope<MoveFundsResponseData>(
      '/moveFunds',
      body,
    );
  }

  // ─────────── internals ───────────

  private async postRaw<T>(path: string, body: unknown): Promise<T> {
    this.assertEnabled();
    try {
      const res = await this.http!.post<T>(path, body);
      return res.data;
    } catch (err) {
      throw this.translateAxiosError(err, path);
    }
  }

  private async postEnvelope<T>(path: string, body: unknown): Promise<T> {
    this.assertEnabled();
    const started = Date.now();
    try {
      const res = await this.http!.post<ProviderEnvelope<T>>(path, body);
      const envelope = res.data;
      if (envelope.errors && envelope.errors.length > 0) {
        const code = envelope.errors[0].code;
        this.logger.warn(
          `provider ${path} returned errors in ${Date.now() - started}ms: ${code}`,
        );
        throw new ProviderClientError(
          `Provider returned errors at ${path}: ${envelope.errors
            .map((e) => `${e.code} ${e.title}`)
            .join('; ')}`,
          envelope.errors,
        );
      }
      if (!envelope.data) {
        throw new ProviderClientError(
          `Provider response at ${path} missing data`,
          null,
        );
      }
      this.logger.log(`provider ${path} ok in ${Date.now() - started}ms`);
      return envelope.data;
    } catch (err) {
      if (err instanceof ProviderClientError) throw err;
      throw this.translateAxiosError(err, path);
    }
  }

  private assertEnabled() {
    if (!this.http) {
      throw new ProviderClientError(
        'Provider integration is disabled — check PROVIDER_* env vars',
        null,
      );
    }
  }

  private translateAxiosError(err: unknown, path: string): ProviderClientError {
    const ax = err as AxiosError<ProviderEnvelope<unknown>>;
    const status = ax.response?.status;
    const envelopeErrors = ax.response?.data?.errors ?? null;
    const message = `Provider request failed (${ax.config?.method ?? 'POST'} ${path}${
      status ? ` -> ${status}` : ''
    }): ${ax.message}`;
    this.logger.error(message);
    return new ProviderClientError(message, envelopeErrors, err);
  }
}
