import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '@chesskernel/shared';

interface RequestWithUser extends Request {
  user: AuthUser;
}

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get game by ID' })
  async getGame(@Param('id') id: string) {
    return this.gamesService.getGame(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get game history for a user' })
  async getUserGames(
    @Param('userId') userId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.gamesService.getUserGames(userId, parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('me/history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my game history' })
  async getMyGames(
    @Request() req: RequestWithUser,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.gamesService.getUserGames(req.user.id, parseInt(page, 10), parseInt(limit, 10));
  }
}
