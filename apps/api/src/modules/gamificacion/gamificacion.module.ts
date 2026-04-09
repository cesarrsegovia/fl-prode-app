import { Module } from '@nestjs/common';
import { GamificacionService } from './gamificacion.service';

@Module({
  providers: [GamificacionService],
  exports: [GamificacionService],
})
export class GamificacionModule {}
