import { IsString } from 'class-validator';

export class TopScorerPickDto {
  @IsString()
  playerId!: string;
}
