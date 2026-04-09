export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Room events
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',

  // Feature specific domains (e.g. Matches)
  MATCH_SCORE_UPDATE: 'match-score-update',
  MATCH_STATUS_CHANGE: 'match-status-change',

  // Feature specific domains (e.g. Ranking)
  RANKING_UPDATE: 'ranking-update',
} as const;

export type WsEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS];
