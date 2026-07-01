import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { PresenceService } from './presence.service';
import { GamesModule } from '../modules/games/games.module';
import { MatchmakingModule } from '../modules/matchmaking/matchmaking.module';
import { AuthModule } from '../modules/auth/auth.module';

@Module({
  imports: [GamesModule, MatchmakingModule, AuthModule],
  providers: [GameGateway, PresenceService],
  exports: [GameGateway, PresenceService],
})
export class WebSocketGatewayModule {}
