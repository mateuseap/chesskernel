import { Injectable } from '@nestjs/common';
import { RedisService } from '../database/redis.service';

const ONLINE_TTL = 35;

@Injectable()
export class PresenceService {
  private readonly socketToUser = new Map<string, string>();
  private readonly userToSockets = new Map<string, Set<string>>();

  constructor(private readonly redis: RedisService) {}

  async registerSocket(socketId: string, userId: string): Promise<void> {
    this.socketToUser.set(socketId, userId);

    const sockets = this.userToSockets.get(userId) ?? new Set();
    sockets.add(socketId);
    this.userToSockets.set(userId, sockets);

    await this.redis.set(`user:${userId}:online`, '1', ONLINE_TTL);
  }

  async removeSocket(socketId: string): Promise<void> {
    const userId = this.socketToUser.get(socketId);
    if (!userId) return;

    this.socketToUser.delete(socketId);
    const sockets = this.userToSockets.get(userId);
    if (sockets) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.userToSockets.delete(userId);
        await this.redis.del(`user:${userId}:online`);
      }
    }
  }

  async heartbeat(userId: string): Promise<void> {
    await this.redis.set(`user:${userId}:online`, '1', ONLINE_TTL);
  }

  async isOnline(userId: string): Promise<boolean> {
    const val = await this.redis.get(`user:${userId}:online`);
    return val !== null;
  }

  getUserIdBySocket(socketId: string): string | undefined {
    return this.socketToUser.get(socketId);
  }

  getSocketsByUserId(userId: string): Set<string> {
    return this.userToSockets.get(userId) ?? new Set();
  }
}
