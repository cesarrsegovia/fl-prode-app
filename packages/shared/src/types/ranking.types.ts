export interface RankingEntry {
  userId: string;
  username: string;
  avatarUrl: string | null;
  total: number;
  streak: number;
  position: number;
  positionChange: number;
  correctWinners?: number;
  exactScores?: number;
  exactGoalsSum?: number;
}

export interface GroupRanking {
  groupId: string;
  groupName: string;
  seasonId: string;
  entries: RankingEntry[];
}

export interface GlobalRanking {
  seasonId: string;
  entries: RankingEntry[];
}
