export const WS_EVENTS = {
  // Connection events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECT_ERROR: 'connect_error',

  // Room events
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  JOIN_USER_ROOM: 'join-user-room',
  USER_JOINED: 'user-joined',
  USER_LEFT: 'user-left',

  // Matches
  MATCH_SCORE_UPDATE: 'match-score-update',
  MATCH_STATUS_CHANGE: 'match-status-change',

  // Ranking
  RANKING_UPDATE: 'ranking-update',

  // Notifications
  NOTIFICATION_NEW: 'notification-new',

  // Predictions
  PREDICTION_UPDATED: 'prediction-updated',
} as const;

export type WsEvent = typeof WS_EVENTS[keyof typeof WS_EVENTS];
