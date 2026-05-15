import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';
import { GroupMemberGuard } from '../../common/guards/group-member.guard';

@Module({
  controllers: [GruposController],
  providers: [GruposService, GroupMemberGuard],
  exports: [GruposService],
})
export class GruposModule {}
