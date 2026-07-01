import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { FriendsService } from './friends.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '@chesskernel/shared';

class SendFriendRequestDto {
  @ApiProperty()
  @IsString()
  targetUserId: string;
}

interface RequestWithUser extends Request {
  user: AuthUser;
}

@ApiTags('friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  async getFriends(@Request() req: RequestWithUser) {
    return this.friendsService.getFriends(req.user.id);
  }

  @Get('requests')
  async getPendingRequests(@Request() req: RequestWithUser) {
    return this.friendsService.getPendingRequests(req.user.id);
  }

  @Post('request')
  async sendRequest(@Request() req: RequestWithUser, @Body() dto: SendFriendRequestDto) {
    return this.friendsService.sendRequest(req.user.id, dto.targetUserId);
  }

  @Post(':id/accept')
  async acceptRequest(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.friendsService.acceptRequest(id, req.user.id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: RequestWithUser) {
    return this.friendsService.declineOrRemove(id, req.user.id);
  }
}
