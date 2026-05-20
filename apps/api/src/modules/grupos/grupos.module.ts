import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';
import { GroupMemberGuard } from '../../common/guards/group-member.guard';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [GruposController],
  providers: [GruposService, GroupMemberGuard],
  exports: [GruposService],
})
export class GruposModule {}
