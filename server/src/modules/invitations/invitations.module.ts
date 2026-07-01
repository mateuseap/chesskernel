import { Module } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { GamesModule } from '../games/games.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [GamesModule, NotificationsModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
