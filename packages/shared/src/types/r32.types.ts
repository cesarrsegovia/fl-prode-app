export enum R32PickKind {
  TOP2 = 'TOP2',
  BEST_THIRD = 'BEST_THIRD',
}

export interface R32QualifierPickInput {
  teamId: string;
  kind: R32PickKind;
}

export interface R32QualifierPick {
  id: string;
  userId: string;
  tournamentId: string;
  teamId: string;
  kind: R32PickKind;
  pointsEarned: number | null;
  createdAt: Date;
}
