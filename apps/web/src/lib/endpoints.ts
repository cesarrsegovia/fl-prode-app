import type {
  FixtureWithMatches,
  Prediction,
  RankingEntry,
  Result,
} from '@prode/shared';
import { apiClient } from './api';

// ---------- Fixtures ----------
export const fixtures = {
  active: () =>
    apiClient.get<FixtureWithMatches[]>('/fixtures/active').then((r) => r.data),
  upcoming: (limit = 5) =>
    apiClient
      .get<FixtureWithMatches[]>('/fixtures/upcoming', { params: { limit } })
      .then((r) => r.data),
  one: (id: string) =>
    apiClient.get<FixtureWithMatches>(`/fixtures/${id}`).then((r) => r.data),
};

// ---------- Pronósticos ----------
export interface CreatePronosticoPayload {
  matchId: string;
  fixtureId: string;
  result: Result;
  homeScoreGuess?: number;
  awayScoreGuess?: number;
  isCaptain?: boolean;
}

export const pronosticos = {
  upsert: (payload: CreatePronosticoPayload) =>
    apiClient.post<Prediction>('/pronosticos', payload).then((r) => r.data),
  byFixture: (fixtureId: string) =>
    apiClient
      .get<(Prediction & { match: unknown })[]>(`/pronosticos/me/${fixtureId}`)
      .then((r) => r.data),
  myFixtures: () =>
    apiClient.get('/pronosticos/me').then((r) => r.data),
  remove: (id: string) =>
    apiClient.delete<{ id: string }>(`/pronosticos/${id}`).then((r) => r.data),
};

// ---------- Ranking ----------
export const ranking = {
  global: () =>
    apiClient.get<RankingEntry[]>('/ranking/global').then((r) => r.data),
  group: (groupId: string) =>
    apiClient
      .get<RankingEntry[]>(`/ranking/grupo/${groupId}`)
      .then((r) => r.data),
};

// ---------- Grupos ----------
export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  isPrivate: boolean;
  _count?: { members: number };
}
export interface MyGroupEntry {
  role: 'ADMIN' | 'MEMBER';
  joinedAt: string;
  group: GroupSummary;
}

export const grupos = {
  mine: () =>
    apiClient.get<MyGroupEntry[]>('/grupos/mine').then((r) => r.data),
  one: (id: string) =>
    apiClient.get(`/grupos/${id}`).then((r) => r.data),
  create: (payload: {
    name: string;
    description?: string;
    isPrivate?: boolean;
  }) => apiClient.post<GroupSummary>('/grupos', payload).then((r) => r.data),
  update: (id: string, payload: Partial<GroupSummary>) =>
    apiClient.patch<GroupSummary>(`/grupos/${id}`, payload).then((r) => r.data),
  remove: (id: string) =>
    apiClient.delete<{ id: string }>(`/grupos/${id}`).then((r) => r.data),
  join: (inviteCode: string) =>
    apiClient
      .post<GroupSummary>('/grupos/join', { inviteCode })
      .then((r) => r.data),
  leave: (id: string) =>
    apiClient.post(`/grupos/${id}/leave`).then((r) => r.data),
  regenerateInvite: (id: string) =>
    apiClient
      .post<{ id: string; inviteCode: string }>(
        `/grupos/${id}/invite/regenerate`,
      )
      .then((r) => r.data),
};

// ---------- Notificaciones ----------
export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}
export const notificaciones = {
  list: () =>
    apiClient.get<NotificationDto[]>('/notificaciones').then((r) => r.data),
  markAllRead: () =>
    apiClient.patch('/notificaciones/read').then((r) => r.data),
};
