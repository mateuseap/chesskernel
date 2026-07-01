import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { ratings: true },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async findByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { ratings: true },
    });
    if (!user) throw new NotFoundException(`User ${username} not found`);
    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateProfile(
    userId: string,
    data: { bio?: string; avatarUrl?: string; country?: string },
  ) {
    return this.prisma.user.update({ where: { id: userId }, data });
  }

  async searchUsers(query: string, limit = 10) {
    return this.prisma.user.findMany({
      where: {
        username: { contains: query, mode: 'insensitive' },
        isBanned: false,
      },
      select: { id: true, username: true, avatarUrl: true },
      take: limit,
    });
  }
}
