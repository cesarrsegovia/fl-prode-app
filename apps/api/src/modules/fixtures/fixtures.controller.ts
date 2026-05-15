import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FixturesService } from './fixtures.service';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CreateFixtureDto } from './dto/create-fixture.dto';
import { UpdateFixtureDto } from './dto/update-fixture.dto';
import { UpdateMatchDto } from './dto/update-match.dto';

@Controller('fixtures')
export class FixturesController {
  constructor(private readonly fixturesService: FixturesService) {}

  @Get('active')
  async findActive() {
    return this.fixturesService.findActive();
  }

  @Get('upcoming')
  async upcoming(@Query('limit') limit?: string) {
    return this.fixturesService.findUpcoming(limit ? Number(limit) : 5);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.fixturesService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Post()
  async create(@Body() body: CreateFixtureDto) {
    return this.fixturesService.create(body);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: UpdateFixtureDto) {
    return this.fixturesService.update(id, body);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.fixturesService.remove(id);
  }

  @UseGuards(AuthGuard('jwt'), AdminGuard)
  @Patch('matches/:matchId')
  async updateMatch(
    @Param('matchId') matchId: string,
    @Body() body: UpdateMatchDto,
  ) {
    return this.fixturesService.updateMatch(matchId, body);
  }
}
