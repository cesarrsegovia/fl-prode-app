import type {
  FixtureWithMatches,
  Prediction,
  R32PickKind,
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

// ---------- Matches ----------
import type { MatchDto } from './server-endpoints';

/** Partido de hoy: mismo shape que MatchDto + fixtureId para linkear a su fecha. */
export type TodayMatchDto = MatchDto & { fixtureId: string };

export const matchesApi = {
  today: () =>
    apiClient.get<TodayMatchDto[]>('/matches/today').then((r) => r.data),
};

// ---------- Pronósticos ----------
export interface CreatePronosticoPayload {
  matchId: string;
  fixtureId: string;
  result: Result;
  homeScoreGuess?: number;
  awayScoreGuess?: number;
  isCaptain?: boolean;
  /** Solo eliminación: a quién hace avanzar por penales si result=DRAW. */
  penaltyWinner?: Result;
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
  predictedMatchIds: () =>
    apiClient
      .get<string[]>('/pronosticos/me/match-ids')
      .then((r) => r.data),
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

export interface GroupPreview {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  createdAt: string;
  _count: { members: number };
}

export const grupos = {
  preview: (inviteCode: string) =>
    apiClient
      .get<GroupPreview>(`/grupos/preview/${encodeURIComponent(inviteCode)}`)
      .then((r) => r.data),
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

// ---------- Bracket pick (campeón del torneo) ----------
export interface BracketPickResponse {
  id: string;
  champTeamId: string;
  champTeam: {
    id: string;
    name: string;
    shortName: string | null;
    flagUrl: string | null;
  };
}

// ---------- Tournament Entry (inscripción con entryFee) ----------
export interface TournamentEntryDto {
  id: string;
  userId: string;
  tournamentId: string;
  amount: string;
  currency: string;
  status: 'PAID' | 'REFUNDED' | 'SETTLED';
  createdAt: string;
}

export const tournamentEntry = {
  mine: (tournamentId: string) =>
    apiClient
      .get<TournamentEntryDto | null>(`/tournaments/${tournamentId}/entry/me`)
      .then((r) => r.data),
  join: (tournamentId: string) =>
    apiClient
      .post<TournamentEntryDto>(`/tournaments/${tournamentId}/entry`)
      .then((r) => r.data),
};

export const bracketPick = {
  mine: (tournamentId: string) =>
    apiClient
      .get<BracketPickResponse | null>(
        `/tournaments/${tournamentId}/bracket-pick/me`,
      )
      .then((r) => r.data),
  set: (tournamentId: string, champTeamId: string) =>
    apiClient
      .post<BracketPickResponse>(
        `/tournaments/${tournamentId}/bracket-pick`,
        { champTeamId },
      )
      .then((r) => r.data),
  deadline: (tournamentId: string) =>
    apiClient
      .get<{ deadline: string | null }>(
        `/tournaments/${tournamentId}/bracket-pick/deadline`,
      )
      .then((r) => r.data),
  ofUser: (tournamentId: string, userId: string, groupId: string) =>
    apiClient
      .get<BracketPickResponse | null>(
        `/tournaments/${tournamentId}/bracket-pick/user/${userId}`,
        { params: { groupId } },
      )
      .then((r) => r.data),
};

// ---------- Top Scorer (Goleador) ----------
export interface TournamentPlayerDto {
  playerId: string;
  name: string;
  position: string | null;
  number: number | null;
  photoUrl: string | null;
  team: {
    id: string;
    name: string;
    shortName: string | null;
    flagUrl: string | null;
  };
}

export interface TopScorerPickResponse {
  id: string;
  playerId: string;
  player: {
    id: string;
    name: string;
    position: string | null;
    photoUrl: string | null;
  };
}

export const tournamentPlayers = {
  list: (tournamentId: string) =>
    apiClient
      .get<TournamentPlayerDto[]>(`/tournaments/${tournamentId}/players`)
      .then((r) => r.data),
};

export const topScorerPick = {
  deadline: (tournamentId: string) =>
    apiClient
      .get<{ deadline: string | null }>(
        `/tournaments/${tournamentId}/top-scorer-pick/deadline`,
      )
      .then((r) => r.data),
  mine: (tournamentId: string) =>
    apiClient
      .get<TopScorerPickResponse | null>(
        `/tournaments/${tournamentId}/top-scorer-pick/me`,
      )
      .then((r) => r.data),
  set: (tournamentId: string, playerId: string) =>
    apiClient
      .post<TopScorerPickResponse>(
        `/tournaments/${tournamentId}/top-scorer-pick`,
        { playerId },
      )
      .then((r) => r.data),
  setWinner: (tournamentId: string, playerId: string | null) =>
    apiClient
      .patch<{ scored: number; usersAffected: number }>(
        `/tournaments/${tournamentId}/top-scorer`,
        { playerId },
      )
      .then((r) => r.data),
  ofUser: (tournamentId: string, userId: string, groupId: string) =>
    apiClient
      .get<TopScorerPickResponse | null>(
        `/tournaments/${tournamentId}/top-scorer-pick/user/${userId}`,
        { params: { groupId } },
      )
      .then((r) => r.data),
};

// ---------- R32 picks (clasificados a 16vos) ----------
export interface R32PickResponse {
  id: string;
  userId: string;
  tournamentId: string;
  teamId: string;
  kind: R32PickKind;
  pointsEarned: number | null;
  createdAt: string;
  team: {
    id: string;
    name: string;
    shortName: string | null;
    flagUrl: string | null;
  };
}

export interface R32PickPayloadItem {
  teamId: string;
  kind: R32PickKind;
}

export const r32Picks = {
  deadline: (tournamentId: string) =>
    apiClient
      .get<{ deadline: string | null }>(
        `/tournaments/${tournamentId}/r32-picks/deadline`,
      )
      .then((r) => r.data),
  mine: (tournamentId: string) =>
    apiClient
      .get<R32PickResponse[]>(`/tournaments/${tournamentId}/r32-picks/me`)
      .then((r) => r.data),
  set: (tournamentId: string, picks: R32PickPayloadItem[]) =>
    apiClient
      .post<R32PickResponse[]>(`/tournaments/${tournamentId}/r32-picks`, {
        picks,
      })
      .then((r) => r.data),
  ofUser: (tournamentId: string, userId: string, groupId: string) =>
    apiClient
      .get<R32PickResponse[]>(
        `/tournaments/${tournamentId}/r32-picks/user/${userId}`,
        { params: { groupId } },
      )
      .then((r) => r.data),
};

// ---------- Admin (usuarios y grupos) ----------
export interface AdminUserItem {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  _count: { predictions: number; memberships: number };
}

export interface AdminGroupItem {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  inviteCode: string;
  createdAt: string;
  _count: { members: number; messages: number; activities: number };
}

export interface AdminOverview {
  users: number;
  groups: number;
  predictions: number;
  messages: number;
  activities: number;
}

export interface AdminUserProde {
  user: {
    id: string;
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
    isAdmin: boolean;
  };
  tournamentId: string | null;
  champion: BracketPickResponse | null;
  topScorer: TopScorerPickResponse | null;
  r32: R32PickResponse[];
  history: { items: PredictionHistoryItem[]; nextCursor: string | null };
}

export const admin = {
  overview: () =>
    apiClient.get<AdminOverview>('/admin/overview').then((r) => r.data),
  userProde: (userId: string, tournamentId?: string) =>
    apiClient
      .get<AdminUserProde>(`/admin/users/${userId}/prode`, {
        params: tournamentId ? { tournamentId } : undefined,
      })
      .then((r) => r.data),
  users: (params: { search?: string; cursor?: string; take?: number } = {}) =>
    apiClient
      .get<{ items: AdminUserItem[]; nextCursor: string | null }>(
        '/admin/users',
        { params },
      )
      .then((r) => r.data),
  setUserAdmin: (userId: string, isAdmin: boolean) =>
    apiClient
      .patch<{ id: string; isAdmin: boolean }>(
        `/admin/users/${userId}/admin`,
        { isAdmin },
      )
      .then((r) => r.data),
  groups: (params: { search?: string; cursor?: string; take?: number } = {}) =>
    apiClient
      .get<{ items: AdminGroupItem[]; nextCursor: string | null }>(
        '/admin/groups',
        { params },
      )
      .then((r) => r.data),
  deleteGroup: (groupId: string) =>
    apiClient
      .delete<{ id: string }>(`/admin/groups/${groupId}`)
      .then((r) => r.data),
};

// ---------- Admin (resultados de partidos) ----------
export const adminMatches = {
  update: (
    matchId: string,
    data: {
      homeScore?: number;
      awayScore?: number;
      status?: 'PENDING' | 'LIVE' | 'FINISHED' | 'CANCELLED';
      homeScoreET?: number;
      awayScoreET?: number;
      homePens?: number;
      awayPens?: number;
    },
  ) =>
    apiClient
      .patch(`/fixtures/matches/${matchId}`, data)
      .then((r) => r.data),
};

// ---------- Stats & Achievements ----------
export interface UserStats {
  totalPredictions: number;
  settledPredictions: number;
  hits: number;
  hitRate: number;
  exactScores: number;
  captain: { played: number; hits: number; hitRate: number };
  totalPoints: number;
  bestFixture: {
    id: string;
    name: string;
    total: number;
    hits: number;
    matches: number;
  } | null;
}

export interface AchievementDto {
  id: string;
  key: string;
  name: string;
  description: string;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface PredictionHistoryItem {
  id: string;
  result: 'HOME' | 'DRAW' | 'AWAY';
  homeScoreGuess: number | null;
  awayScoreGuess: number | null;
  isCaptain: boolean;
  pointsEarned: number | null;
  createdAt: string;
  match: {
    id: string;
    homeTeamName: string;
    awayTeamName: string;
    homeScore: number | null;
    awayScore: number | null;
    status: 'PENDING' | 'LIVE' | 'FINISHED' | 'CANCELLED';
    startTime: string;
    homeTeam: { flagUrl: string | null } | null;
    awayTeam: { flagUrl: string | null } | null;
  };
  fixture: { id: string; round: number; name: string | null };
}

export const users = {
  updateMe: (data: { username?: string; bio?: string; avatarUrl?: string }) =>
    apiClient.patch<{ id: string; username: string | null; bio: string | null; avatarUrl: string | null }>(
      '/users/me',
      data,
    ).then((r) => r.data),
};

export interface TopScorerDto {
  name: string;
  goals: number;
  played: number | null;
  photoUrl: string | null;
  teamName: string | null;
  teamShortName: string | null;
  flagUrl: string | null;
}

export const topScorers = {
  list: (limit = 5) =>
    apiClient
      .get<TopScorerDto[]>('/resultados/top-scorers', { params: { limit } })
      .then((r) => r.data),
};

export const stats = {
  user: (userId: string) =>
    apiClient.get<UserStats>(`/users/${userId}/stats`).then((r) => r.data),
  achievements: () =>
    apiClient
      .get<AchievementDto[]>('/users/me/achievements')
      .then((r) => r.data),
  history: (cursor?: string, take = 30) =>
    apiClient
      .get<{ items: PredictionHistoryItem[]; nextCursor: string | null }>(
        '/users/me/predictions',
        { params: { cursor, take } },
      )
      .then((r) => r.data),
  userHistory: (userId: string, groupId: string, cursor?: string, take = 30) =>
    apiClient
      .get<{ items: PredictionHistoryItem[]; nextCursor: string | null }>(
        `/users/${userId}/predictions`,
        { params: { groupId, cursor, take } },
      )
      .then((r) => r.data),
};

export interface MatchGroupAggregate {
  total: number;
  members: number;
  pending: number;
  home: number;
  draw: number;
  away: number;
  homePct: number;
  drawPct: number;
  awayPct: number;
}

export interface GroupMemberPick {
  user: { id: string; username: string; avatarUrl: string | null };
  prediction: {
    result: 'HOME' | 'DRAW' | 'AWAY';
    homeScoreGuess: number | null;
    awayScoreGuess: number | null;
    isCaptain: boolean;
    pointsEarned: number | null;
  } | null;
}

export interface MatchGroupPicks {
  closed: boolean;
  members: GroupMemberPick[];
}

export const matchStats = {
  groupAggregate: (matchId: string, groupId: string) =>
    apiClient
      .get<MatchGroupAggregate>(
        `/matches/${matchId}/predictions/group/${groupId}`,
      )
      .then((r) => r.data),
  groupPicks: (matchId: string, groupId: string) =>
    apiClient
      .get<MatchGroupPicks>(
        `/matches/${matchId}/predictions/group/${groupId}/picks`,
      )
      .then((r) => r.data),
};

// ---------- Notificaciones ----------
export interface NotificationDto {
  id: string;
  userId: string;
  type: string;
  message: string;
  /** { key, params } para traducir en el front; si falta, se usa `message`. */
  payload: {
    key?: string;
    params?: Record<string, string | number>;
  } | null;
  read: boolean;
  createdAt: string;
}
export const notificaciones = {
  list: () =>
    apiClient.get<NotificationDto[]>('/notificaciones').then((r) => r.data),
  markAllRead: () =>
    apiClient.patch('/notificaciones/read').then((r) => r.data),
  markOneRead: (id: string) =>
    apiClient.patch(`/notificaciones/${id}/read`).then((r) => r.data),
};

// ---------- Activity feed ----------
export type ActivityFeedType =
  | 'MEMBER_JOINED'
  | 'PREDICTIONS_SUBMITTED'
  | 'POINTS_EARNED'
  | 'RANK_UP'
  | 'BRACKET_PICK'
  | 'ACHIEVEMENT_UNLOCKED';

export interface ActivityItem {
  id: string;
  groupId: string;
  userId: string;
  type: ActivityFeedType;
  message: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export const activity = {
  byGroup: (groupId: string, cursor?: string, take = 50) =>
    apiClient
      .get<ActivityItem[]>(`/grupos/${groupId}/activity`, {
        params: { cursor, take },
      })
      .then((r) => r.data),
};

// ---------- Chat de grupo ----------
export interface ChatMessage {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
}

export const messages = {
  byGroup: (groupId: string, cursor?: string, take = 50) =>
    apiClient
      .get<ChatMessage[]>(`/grupos/${groupId}/messages`, {
        params: { cursor, take },
      })
      .then((r) => r.data),
  send: (groupId: string, content: string) =>
    apiClient
      .post<ChatMessage>(`/grupos/${groupId}/messages`, { content })
      .then((r) => r.data),
};
