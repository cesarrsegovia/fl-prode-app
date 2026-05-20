import { IsString } from 'class-validator';

export class BracketPickDto {
  @IsString()
  champTeamId!: string;
}
