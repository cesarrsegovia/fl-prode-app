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
