import { Controller, Get, Put, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '@chesskernel/shared';

interface RequestWithUser extends Request {
  user: AuthUser;
}

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getUnread(@Request() req: RequestWithUser) {
    return this.notificationsService.getUnread(req.user.id);
  }

  @Put('read-all')
  async markAllRead(@Request() req: RequestWithUser) {
    await this.notificationsService.markAllRead(req.user.id);
  }

  @Put(':id/read')
  async markRead(@Param('id') id: string, @Request() req: RequestWithUser) {
    await this.notificationsService.markRead(id, req.user.id);
  }
}
