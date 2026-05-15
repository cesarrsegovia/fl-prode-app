import { IsString, Length } from 'class-validator';

export class JoinGrupoDto {
  @IsString()
  @Length(4, 40)
  inviteCode!: string;
}
