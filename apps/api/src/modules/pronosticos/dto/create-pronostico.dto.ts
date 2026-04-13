import { IsString, IsEnum, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';
import { Result } from '@prisma/client';

export class CreatePronosticoDto {
  @IsString()
  matchId!: string;

  @IsString()
  fixtureId!: string;

  @IsEnum(Result)
  result!: Result;

  @IsOptional()
  @IsInt()
  @Min(0)
  homeScoreGuess?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  awayScoreGuess?: number;

  @IsOptional()
  @IsBoolean()
  isCaptain?: boolean;
}
