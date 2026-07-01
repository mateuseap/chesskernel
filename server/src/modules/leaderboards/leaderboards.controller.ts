import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TimeControl } from '@prisma/client';
import { LeaderboardsService } from './leaderboards.service';

@ApiTags('leaderboards')
@Controller('leaderboards')
export class LeaderboardsController {
  constructor(private readonly leaderboardsService: LeaderboardsService) {}

  @Get(':timeControl')
  async getLeaderboard(
    @Param('timeControl') timeControl: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.leaderboardsService.getLeaderboard(
      timeControl as TimeControl,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
