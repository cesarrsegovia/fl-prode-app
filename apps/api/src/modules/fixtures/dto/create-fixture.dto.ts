import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateMatchInFixtureDto {
  @IsString()
  homeTeam!: string;

  @IsString()
  awayTeam!: string;

  @IsDate()
  @Type(() => Date)
  startTime!: Date;

  @IsOptional()
  @IsString()
  externalId?: string;
}

export class CreateFixtureDto {
  @IsString()
  tournamentId!: string;

  @IsInt()
  @Min(1)
  round!: number;

  @IsDate()
  @Type(() => Date)
  closeAt!: Date;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMatchInFixtureDto)
  matches?: CreateMatchInFixtureDto[];
}
