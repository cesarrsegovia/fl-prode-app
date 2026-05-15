import { IsOptional, IsString, IsUrl, Length } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(3, 30)
  username?: string;

  @IsOptional()
  @IsString()
  @Length(0, 280)
  bio?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
