import { Module } from '@nestjs/common';
import { WorldCupImporterService } from './worldcup-importer.service';

@Module({
  providers: [WorldCupImporterService],
  exports: [WorldCupImporterService],
})
export class ImporterModule {}
