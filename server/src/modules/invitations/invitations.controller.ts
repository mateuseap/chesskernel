import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '@chesskernel/shared';

class CreateInvitationDto {
  @ApiProperty()
  @IsString()
  timeControlKey: string;

  @ApiProperty()
  @IsString()
  @IsIn(['white', 'black', 'random'])
  colorPreference: 'white' | 'black' | 'random';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  receiverId?: string;
}

interface RequestWithUser extends Request {
  user: AuthUser;
}

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(':token')
  async getByToken(@Param('token') token: string) {
    return this.invitationsService.getByToken(token);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(@Request() req: RequestWithUser, @Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(
      req.user.id,
      dto.timeControlKey,
      dto.colorPreference,
      dto.receiverId,
    );
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async accept(@Param('token') token: string, @Request() req: RequestWithUser) {
    return this.invitationsService.accept(token, req.user.id);
  }
}
