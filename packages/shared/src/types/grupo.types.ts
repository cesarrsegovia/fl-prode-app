export interface Group {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  isPrivate: boolean;
  createdAt: Date;
}

export interface GroupMember {
  id: string;
  userId: string;
  groupId: string;
  role: Role;
  joinedAt: Date;
}

export interface GroupScore {
  id: string;
  groupId: string;
  userId: string;
  seasonId: string;
  total: number;
  streak: number;
}

export enum Role {
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}
