import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { TimeControl } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GamesService } from '../games/games.service';
import { NotificationsService } from '../notifications/notifications.service';
import { TIME_CONTROLS } from '@chesskernel/shared';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gamesService: GamesService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(
    senderId: string,
    timeControlKey: string,
    colorPreference: 'white' | 'black' | 'random',
    receiverId?: string,
  ) {
    const tc = TIME_CONTROLS[timeControlKey];
    if (!tc) throw new BadRequestException(`Unknown time control: ${timeControlKey}`);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const invitation = await this.prisma.invitation.create({
      data: {
        senderId,
        receiverId: receiverId ?? null,
        token,
        timeControl: tc.type as TimeControl,
        initialTimeMs: tc.initialTimeMs,
        incrementMs: tc.incrementMs,
        colorPreference,
        expiresAt,
      },
    });

    if (receiverId) {
      const sender = await this.prisma.user.findUnique({
        where: { id: senderId },
        select: { username: true },
      });

      await this.notifications.create(receiverId, 'game_invite', {
        invitationId: invitation.id,
        token,
        senderUsername: sender?.username,
        timeControlKey,
      });
    }

    return invitation;
  }

  async accept(token: string, acceptingUserId: string) {
    const invitation = await this.prisma.invitation.findUnique({ where: { token } });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'pending') throw new BadRequestException('Invitation is no longer valid');
    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({ where: { id: invitation.id }, data: { status: 'expired' } });
      throw new BadRequestException('Invitation has expired');
    }
    if (invitation.senderId === acceptingUserId) {
      throw new ForbiddenException('Cannot accept your own invitation');
    }
    if (invitation.receiverId && invitation.receiverId !== acceptingUserId) {
      throw new ForbiddenException('This invitation is not for you');
    }

    const tcKey = Object.entries(TIME_CONTROLS).find(
      ([, tc]) =>
        tc.type === invitation.timeControl &&
        tc.initialTimeMs === invitation.initialTimeMs &&
        tc.incrementMs === invitation.incrementMs,
    )?.[0];

    if (!tcKey) throw new BadRequestException('Invalid time control configuration');

    const color =
      invitation.colorPreference === 'random'
        ? Math.random() < 0.5
          ? 'white'
          : 'black'
        : invitation.colorPreference;

    const whiteId = color === 'white' ? invitation.senderId : acceptingUserId;
    const blackId = color === 'black' ? invitation.senderId : acceptingUserId;

    const game = await this.gamesService.createGame(whiteId, blackId, tcKey);

    await this.prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return { gameId: game.id, color };
  }

  async getByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { token },
      include: { sender: { select: { id: true, username: true, avatarUrl: true } } },
    });
    if (!invitation) throw new NotFoundException('Invitation not found');
    return invitation;
  }
}
