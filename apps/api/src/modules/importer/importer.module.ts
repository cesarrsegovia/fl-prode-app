import { Module } from '@nestjs/common';
import { WorldCupImporterService } from './worldcup-importer.service';
import { WorldCupSeederService } from './worldcup-seeder.service';
import { SquadSeederService } from './squad-seeder.service';

@Module({
  providers: [
    WorldCupImporterService,
    WorldCupSeederService,
    SquadSeederService,
  ],
  exports: [
    WorldCupImporterService,
    WorldCupSeederService,
    SquadSeederService,
  ],
})
export class ImporterModule {}
