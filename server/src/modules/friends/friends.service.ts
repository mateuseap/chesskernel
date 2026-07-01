import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class FriendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async sendRequest(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) throw new BadRequestException('Cannot add yourself');

    const existing = await this.prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'accepted') throw new ConflictException('Already friends');
      if (existing.status === 'pending') throw new ConflictException('Friend request already sent');
      if (existing.status === 'blocked') throw new BadRequestException('Cannot send request');
    }

    const friendship = await this.prisma.friend.create({
      data: { requesterId, addresseeId, status: 'pending' },
    });

    const requester = await this.prisma.user.findUnique({
      where: { id: requesterId },
      select: { username: true },
    });

    await this.notifications.create(addresseeId, 'friend_request', {
      requesterId,
      requesterUsername: requester?.username,
      friendshipId: friendship.id,
    });

    return friendship;
  }

  async acceptRequest(friendshipId: string, addresseeId: string) {
    const friendship = await this.prisma.friend.findFirst({
      where: { id: friendshipId, addresseeId, status: 'pending' },
    });
    if (!friendship) throw new NotFoundException('Friend request not found');

    const updated = await this.prisma.friend.update({
      where: { id: friendshipId },
      data: { status: 'accepted' },
    });

    await this.notifications.create(friendship.requesterId, 'friend_accepted', {
      addresseeId,
      friendshipId,
    });

    return updated;
  }

  async declineOrRemove(friendshipId: string, userId: string) {
    const friendship = await this.prisma.friend.findFirst({
      where: {
        id: friendshipId,
        OR: [{ requesterId: userId }, { addresseeId: userId }],
      },
    });
    if (!friendship) throw new NotFoundException('Friendship not found');

    await this.prisma.friend.delete({ where: { id: friendshipId } });
  }

  async getFriends(userId: string) {
    return this.prisma.friend.findMany({
      where: {
        OR: [{ requesterId: userId }, { addresseeId: userId }],
        status: 'accepted',
      },
      include: {
        requester: { select: { id: true, username: true, avatarUrl: true } },
        addressee: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }

  async getPendingRequests(userId: string) {
    return this.prisma.friend.findMany({
      where: { addresseeId: userId, status: 'pending' },
      include: {
        requester: { select: { id: true, username: true, avatarUrl: true } },
      },
    });
  }
}
