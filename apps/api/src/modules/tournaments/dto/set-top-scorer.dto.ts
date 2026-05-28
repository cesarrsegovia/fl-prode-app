import { IsOptional, IsString } from 'class-validator';

export class SetTopScorerDto {
  @IsString()
  @IsOptional()
  playerId?: string | null;
}
