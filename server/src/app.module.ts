import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GamesModule } from './modules/games/games.module';
import { MatchmakingModule } from './modules/matchmaking/matchmaking.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { BotsModule } from './modules/bots/bots.module';
import { FriendsModule } from './modules/friends/friends.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module';
import { WebSocketGatewayModule } from './websocket/websocket.module';
import { MetricsModule } from './metrics/metrics.module';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig],
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    DatabaseModule,
    WebSocketGatewayModule,
    MetricsModule,
    AuthModule,
    UsersModule,
    GamesModule,
    MatchmakingModule,
    RatingsModule,
    AnalysisModule,
    BotsModule,
    FriendsModule,
    InvitationsModule,
    NotificationsModule,
    LeaderboardsModule,
  ],
})
export class AppModule {}
