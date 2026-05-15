import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateGrupoDto {
  @IsString()
  @Length(3, 50)
  name!: string;

  @IsOptional()
  @IsString()
  @Length(0, 280)
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}
