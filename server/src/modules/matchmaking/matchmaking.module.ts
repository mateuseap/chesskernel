import { Module } from '@nestjs/common';
import { MatchmakingService } from './matchmaking.service';
import { MatchmakingController } from './matchmaking.controller';
import { GamesModule } from '../games/games.module';
import { RatingsModule } from '../ratings/ratings.module';

@Module({
  imports: [GamesModule, RatingsModule],
  controllers: [MatchmakingController],
  providers: [MatchmakingService],
  exports: [MatchmakingService],
})
export class MatchmakingModule {}
