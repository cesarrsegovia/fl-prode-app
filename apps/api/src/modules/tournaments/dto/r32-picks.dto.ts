import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsString,
  ValidateNested,
} from 'class-validator';
import { R32PickKind } from '@prisma/client';
import { R32_TOTAL_QUALIFIERS } from '@prode/shared';

export class R32QualifierPickItemDto {
  @IsString()
  teamId!: string;

  @IsEnum(R32PickKind)
  kind!: R32PickKind;
}

export class R32QualifierPicksDto {
  @IsArray()
  @ArrayMinSize(R32_TOTAL_QUALIFIERS)
  @ArrayMaxSize(R32_TOTAL_QUALIFIERS)
  @ValidateNested({ each: true })
  @Type(() => R32QualifierPickItemDto)
  picks!: R32QualifierPickItemDto[];
}
