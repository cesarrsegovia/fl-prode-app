/**
 * Tipos del contrato del backend padre (estilo Lucky Streak).
 * Todas las respuestas vienen envueltas en `{ data, errors }`.
 */

export interface ProviderErrorPayload {
  code: string;
  title: string;
  detail: string;
  additional_fields?: Record<string, unknown>;
}

export interface ProviderEnvelope<T> {
  data: T | null;
  errors: ProviderErrorPayload[] | null;
}

// ─────────── /games/launch ───────────

export interface LaunchRequest {
  identifier: string;       // gameId del catálogo del padre
  userId: string;           // wallet/internal id que el padre conoce
  currency: string;
  demo?: boolean;
  isMobile?: boolean;
  locale?: string;
  referrer?: string;
}

export interface LaunchResponse {
  game_url: string;
  sessionId: string;
}

// ─────────── /providers/{provider}/authenticate ───────────

export interface AuthenticateRequest {
  data: {
    operatorName: string;
    authorizationCode: string;
  };
}

export interface AuthenticateResponseData {
  userName: string;
  currency: string;
  language: string;
  nickname: string;
  balance: number;
  balanceTimestamp: string;
}

// ─────────── /providers/{provider}/moveFunds ───────────

export type WalletDirectionString = 'Debit' | 'Credit';

export interface MoveFundsRequest {
  data: {
    transactionRequestId: string;
    username: string;
    direction: WalletDirectionString;
    amount: number;
    currency: string;
    eventId: string;
    gameId: string;
    gameType: string;
    eventDetails: {
      roundId: string;
      refTransactionId?: string;
    };
  };
}

export interface MoveFundsResponseData {
  refTransactionId: string;
  currency: string;
  balance: number;
  balanceTimestamp: string;
}
