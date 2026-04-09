export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  fixtureId: string;
  result: Result;
  homeScoreGuess: number | null;
  awayScoreGuess: number | null;
  isCaptain: boolean;
  pointsEarned: number | null;
  createdAt: Date;
}

export enum Result {
  HOME = 'HOME',
  DRAW = 'DRAW',
  AWAY = 'AWAY',
}
