export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  unlockedAt: Date;
}

export enum NotificationType {
  FIXTURE_CLOSING = 'FIXTURE_CLOSING',
  RESULT_CALCULATED = 'RESULT_CALCULATED',
  RANKING_CHANGE = 'RANKING_CHANGE',
  GROUP_INVITE = 'GROUP_INVITE',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
}
