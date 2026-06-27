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

  // Solo eliminación: si result=DRAW, a qué equipo hace avanzar por penales.
  @IsOptional()
  @IsEnum(Result)
  penaltyWinner?: Result;
}
