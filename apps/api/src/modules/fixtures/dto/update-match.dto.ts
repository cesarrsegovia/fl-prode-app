import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MatchStatus } from '@prisma/client';

export class UpdateMatchDto {
  @IsOptional()
  @IsString()
  homeTeamName?: string;

  @IsOptional()
  @IsString()
  awayTeamName?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startTime?: Date;

  @IsOptional()
  @IsInt()
  @Min(0)
  homeScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  awayScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  homeScoreET?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  awayScoreET?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  homePens?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  awayPens?: number;

  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsString()
  externalId?: string;
}
