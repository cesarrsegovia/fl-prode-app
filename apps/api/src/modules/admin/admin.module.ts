import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { TournamentsModule } from '../tournaments/tournaments.module';
import { UsuariosModule } from '../usuarios/usuarios.module';

@Module({
  imports: [TournamentsModule, UsuariosModule],
  controllers: [AdminController],
  providers: [AdminService, AdminGuard],
  exports: [AdminService],
})
export class AdminModule {}
