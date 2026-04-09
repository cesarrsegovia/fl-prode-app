import { Controller, Get, Param } from '@nestjs/common';
import { FixturesService } from './fixtures.service';

@Controller('fixtures')
export class FixturesController {
  constructor(private readonly fixturesService: FixturesService) {}

  @Get('active')
  async findActive() {
    return this.fixturesService.findActive();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.fixturesService.findOne(id);
  }
}
