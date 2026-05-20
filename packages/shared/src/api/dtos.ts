// Standard API Response envelope
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: number;
    [key: string]: any;
  };
}

// WebSocket Standard Payload envelope
export interface WsPayload<T = any> {
  roomId?: string;
  data: T;
  timestamp: number;
}

// Example DTO for WS Room joining
export interface JoinRoomDto {
  roomId: string;
}

export interface MatchScoreUpdateDto {
  matchId: string;
  homeScore: number;
  awayScore: number;
}

export type ActivityFeedType =
  | 'MEMBER_JOINED'
  | 'PREDICTIONS_SUBMITTED'
  | 'POINTS_EARNED'
  | 'RANK_UP'
  | 'BRACKET_PICK'
  | 'ACHIEVEMENT_UNLOCKED';

export interface ActivityFeedItemDto {
  id: string;
  groupId: string;
  userId: string;
  type: ActivityFeedType;
  message: string;
  payload?: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
}

export interface GroupMessageDto {
  id: string;
  groupId: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl?: string | null;
  };
}

export interface SendGroupMessageDto {
  content: string;
}
