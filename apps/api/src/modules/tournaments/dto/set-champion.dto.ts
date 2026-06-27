import { IsOptional, IsString } from 'class-validator';

export class SetChampionDto {
  @IsString()
  @IsOptional()
  teamId?: string | null;
}
