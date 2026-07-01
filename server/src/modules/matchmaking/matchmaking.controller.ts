import { Controller, Post, Body, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MatchmakingService } from './matchmaking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '@chesskernel/shared';
import { TIME_CONTROLS } from '@chesskernel/shared';

class CreateBotGameDto {
  @ApiProperty()
  @IsString()
  timeControlKey: string;

  @ApiProperty()
  @IsString()
  @IsIn(['beginner', 'easy', 'medium', 'hard', 'expert', 'maximum'])
  difficulty: string;

  @ApiProperty()
  @IsString()
  @IsIn(['white', 'black', 'random'])
  colorPreference: 'white' | 'black' | 'random';
}

interface RequestWithUser extends Request {
  user: AuthUser;
}

@ApiTags('matchmaking')
@Controller('matchmaking')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MatchmakingController {
  constructor(private readonly matchmakingService: MatchmakingService) {}

  @Post('bot')
  @ApiOperation({ summary: 'Create a bot game' })
  async createBotGame(@Request() req: RequestWithUser, @Body() dto: CreateBotGameDto) {
    return this.matchmakingService.createBotGame(
      req.user.id,
      dto.timeControlKey,
      dto.difficulty,
      dto.colorPreference,
    );
  }
}
