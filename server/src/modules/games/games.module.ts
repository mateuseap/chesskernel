import { Module } from '@nestjs/common';
import { GamesController } from './games.controller';
import { GamesService } from './games.service';
import { GameStateService } from './game-state.service';
import { ClockService } from './clock.service';
import { RatingsModule } from '../ratings/ratings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [RatingsModule, NotificationsModule],
  controllers: [GamesController],
  providers: [GamesService, GameStateService, ClockService],
  exports: [GamesService, GameStateService, ClockService],
})
export class GamesModule {}
