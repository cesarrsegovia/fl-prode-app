import { Module } from '@nestjs/common';
import { WorldCupImporterService } from './worldcup-importer.service';
import { WorldCupSeederService } from './worldcup-seeder.service';

@Module({
  providers: [WorldCupImporterService, WorldCupSeederService],
  exports: [WorldCupImporterService, WorldCupSeederService],
})
export class ImporterModule {}
