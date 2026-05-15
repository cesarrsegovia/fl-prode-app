import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateFixtureDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  round?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  closeAt?: Date;
}
