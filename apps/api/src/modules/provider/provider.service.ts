import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  WalletDirection,
  WalletTxStatus,
  TournamentEntryStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ProviderClient, ProviderClientError } from './provider.client';
import {
  PROVIDER_CONFIG,
  type ProviderConfig,
} from './provider.config';
import type {
  AuthenticateResponseData,
  LaunchRequest,
  LaunchResponse,
  MoveFundsResponseData,
  WalletDirectionString,
} from './provider.types';

export interface ExchangeResult {
  user: {
    id: string;
    providerUserId: string;
    currency: string;
    locale: string | null;
    balance: number;
  };
  sessionId: string;
}

export interface MoveFundsInput {
  userId: string;
  direction: WalletDirectionString;
  amount: number | Prisma.Decimal;
  currency: string;
  /** ID estable del evento — torneo, fecha, ronda, etc. */
  eventId: string;
  /** ID del juego (en nuestro caso suele ser tournamentId). */
  gameId: string;
  gameType?: string;
  roundId?: string;
  /** Si es Credit que liquida un Debit, pasar el transactionRequestId del Debit original. */
  refTransactionRequestId?: string;
  tournamentId?: string;
  fixtureId?: string;
}

@Injectable()
export class ProviderService {
  private readonly logger = new Logger(ProviderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly client: ProviderClient,
    @Inject(PROVIDER_CONFIG) private readonly config: ProviderConfig,
  ) {}

  // ─────────── launch ───────────
  /**
   * Llama al padre para crear una sesión de juego. Lo usamos en escenarios donde
   * Prode actúa como launcher (no es el flujo principal — normalmente el padre nos
   * redirige usuarios directamente).
   */
  async launch(input: LaunchRequest): Promise<LaunchResponse> {
    return this.client.launch(input);
  }

  // ─────────── exchange authCode ───────────
  /**
   * El frontend recibe `?authorizationCode=...` del padre.
   * Este método:
   *   1. Llama al padre /authenticate para canjear el code por datos del usuario.
   *   2. Upserts el User local por (providerName, providerUserId).
   *   3. Crea/actualiza ProviderSession (one per authCode).
   * Devuelve el user listo para que auth.service emita un JWT propio.
   */
  async exchangeAuthorizationCode(authorizationCode: string): Promise<ExchangeResult> {
    if (!this.client.enabled) {
      throw new ProviderClientError(
        'Provider integration disabled',
        null,
      );
    }

    // Cache: si ya canjeamos este code, devolvemos lo mismo (idempotente).
    const cached = await this.prisma.providerSession.findUnique({
      where: { authorizationCode },
    });

    let data: AuthenticateResponseData;
    if (cached && cached.consumedAt && cached.providerUserId) {
      // Ya autenticado — reusamos el snapshot. Refresh opcional contra padre.
      data = {
        userName: cached.providerUserId,
        currency: cached.currency || 'USD',
        language: (cached.locale || 'en').split('-')[0],
        nickname: cached.providerUserId,
        balance: 0,
        balanceTimestamp: new Date().toISOString(),
      };
    } else {
      data = await this.client.authenticate(authorizationCode);
    }

    const user = await this.prisma.user.upsert({
      where: {
        providerName_providerUserId: {
          providerName: this.config.name,
          providerUserId: data.userName,
        },
      },
      update: {
        currency: data.currency,
        locale: data.language || undefined,
      },
      create: {
        providerName: this.config.name,
        providerUserId: data.userName,
        currency: data.currency,
        locale: data.language,
      },
    });

    const session = await this.prisma.providerSession.upsert({
      where: { authorizationCode },
      update: {
        userId: user.id,
        providerUserId: data.userName,
        currency: data.currency,
        locale: data.language,
        consumedAt: cached?.consumedAt ?? new Date(),
        exchangedAt: new Date(),
      },
      create: {
        providerName: this.config.name,
        operatorName: this.config.operatorName,
        authorizationCode,
        userId: user.id,
        providerUserId: data.userName,
        currency: data.currency,
        locale: data.language,
        consumedAt: new Date(),
        exchangedAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        providerUserId: data.userName,
        currency: data.currency,
        locale: data.language ?? null,
        balance: data.balance,
      },
      sessionId: session.id,
    };
  }

  // ─────────── moveFunds ───────────
  /**
   * Llama al padre /moveFunds y persiste el resultado en WalletTransaction de forma
   * idempotente. Si el padre devuelve `errors`, dejamos el log en FAILED y re-lanzamos.
   */
  async moveFunds(input: MoveFundsInput): Promise<MoveFundsResponseData> {
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, providerName: true, providerUserId: true },
    });
    if (!user?.providerUserId) {
      throw new ProviderClientError(
        `User ${input.userId} has no providerUserId — cannot move funds`,
        null,
      );
    }

    const direction =
      input.direction === 'Debit' ? WalletDirection.DEBIT : WalletDirection.CREDIT;
    const amount = new Prisma.Decimal(input.amount);
    const transactionRequestId = randomUUID();
    const roundId = input.roundId || input.eventId;

    // Insert PENDING antes de llamar al padre — permite reintentos y trazabilidad.
    const tx = await this.prisma.walletTransaction.create({
      data: {
        userId: user.id,
        providerName: this.config.name,
        direction,
        amount,
        currency: input.currency,
        transactionRequestId,
        eventId: input.eventId,
        gameId: input.gameId,
        gameType: input.gameType,
        roundId,
        refTransactionId: input.refTransactionRequestId,
        tournamentId: input.tournamentId,
        fixtureId: input.fixtureId,
        status: WalletTxStatus.PENDING,
      },
    });

    try {
      const data = await this.client.moveFunds({
        transactionRequestId,
        username: user.providerUserId,
        direction: input.direction,
        amount: Number(amount),
        currency: input.currency,
        eventId: input.eventId,
        gameId: input.gameId,
        gameType: input.gameType ?? 'ProdePrediction',
        eventDetails: {
          roundId,
          refTransactionId: input.refTransactionRequestId,
        },
      });

      await this.prisma.walletTransaction.update({
        where: { id: tx.id },
        data: { status: WalletTxStatus.OK },
      });

      // Si el move toca un torneo, mantenemos TournamentEntry sincronizado.
      if (input.tournamentId) {
        await this.syncTournamentEntry({
          userId: user.id,
          tournamentId: input.tournamentId,
          direction,
          walletTxId: tx.id,
          amount,
          currency: input.currency,
        });
      }

      return data;
    } catch (err) {
      const providerErr =
        err instanceof ProviderClientError ? err.providerErrors?.[0] : undefined;
      await this.prisma.walletTransaction.update({
        where: { id: tx.id },
        data: {
          status: WalletTxStatus.FAILED,
          errorCode: providerErr?.code,
          errorDetail: providerErr?.detail || (err as Error).message,
        },
      });
      throw err;
    }
  }

  // ─────────── helpers ───────────

  private async syncTournamentEntry(params: {
    userId: string;
    tournamentId: string;
    direction: WalletDirection;
    walletTxId: string;
    amount: Prisma.Decimal;
    currency: string;
  }) {
    if (params.direction === WalletDirection.DEBIT) {
      await this.prisma.tournamentEntry.upsert({
        where: {
          userId_tournamentId: {
            userId: params.userId,
            tournamentId: params.tournamentId,
          },
        },
        create: {
          userId: params.userId,
          tournamentId: params.tournamentId,
          debitTxId: params.walletTxId,
          amount: params.amount,
          currency: params.currency,
          status: TournamentEntryStatus.PAID,
        },
        update: {
          debitTxId: params.walletTxId,
          amount: params.amount,
          currency: params.currency,
          status: TournamentEntryStatus.PAID,
        },
      });
    } else {
      const entry = await this.prisma.tournamentEntry.findUnique({
        where: {
          userId_tournamentId: {
            userId: params.userId,
            tournamentId: params.tournamentId,
          },
        },
      });
      if (entry) {
        await this.prisma.tournamentEntry.update({
          where: { id: entry.id },
          data: {
            creditTxId: params.walletTxId,
            status: TournamentEntryStatus.SETTLED,
          },
        });
      }
    }
  }
}
