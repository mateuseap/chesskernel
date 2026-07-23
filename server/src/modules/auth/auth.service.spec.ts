import { Test } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { UsersService } from '../users/users.service';

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

describe('AuthService', () => {
  let service: AuthService;
  let passwordHash: string;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const jwtService = { sign: jest.fn().mockReturnValue('signed-access-token') };
  const configService = { get: jest.fn().mockReturnValue('7d') };

  const dbUser = {
    id: 'u1',
    username: 'magnus',
    email: 'magnus@example.com',
    avatarUrl: null,
    isAdmin: false,
    isBanned: false,
    passwordHash: '',
  };

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correct-horse', 4);
    dbUser.passwordHash = passwordHash;
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jwtService.sign.mockReturnValue('signed-access-token');
    configService.get.mockReturnValue('7d');

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: UsersService, useValue: {} },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  describe('validateUser', () => {
    it('returns null when no user matches the email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      expect(await service.validateUser('nobody@example.com', 'pw')).toBeNull();
    });

    it('throws UnauthorizedException for banned accounts before checking the password', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...dbUser, isBanned: true });
      await expect(service.validateUser(dbUser.email, 'correct-horse')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns null for a wrong password', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);
      expect(await service.validateUser(dbUser.email, 'wrong-password')).toBeNull();
    });

    it('returns the public auth user shape for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(dbUser);

      const result = await service.validateUser(dbUser.email, 'correct-horse');

      expect(result).toEqual({
        id: 'u1',
        username: 'magnus',
        email: 'magnus@example.com',
        avatarUrl: null,
        isAdmin: false,
      });
    });
  });

  describe('register', () => {
    const dto = { username: 'magnus', email: 'magnus@example.com', password: 'correct-horse' };

    it('rejects duplicate emails with ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(dbUser);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('rejects duplicate usernames with ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(dbUser);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates the user with a bcrypt hash and one rating row per time control', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(dbUser);
      prisma.refreshToken.create.mockResolvedValue({});

      await service.register(dto);

      const createArg = prisma.user.create.mock.calls[0][0];
      expect(createArg.data.username).toBe('magnus');
      expect(createArg.data.email).toBe('magnus@example.com');
      expect(createArg.data.passwordHash).not.toBe('correct-horse');
      expect(await bcrypt.compare('correct-horse', createArg.data.passwordHash)).toBe(true);
      expect(createArg.data.ratings.create).toEqual([
        { timeControl: 'bullet' },
        { timeControl: 'blitz' },
        { timeControl: 'rapid' },
        { timeControl: 'classical' },
      ]);
    });

    it('returns a full token pair with the public user shape', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(dbUser);
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.register(dto);

      expect(result.accessToken).toBe('signed-access-token');
      expect(typeof result.refreshToken).toBe('string');
      expect(result.refreshToken.length).toBe(96);
      expect(result.expiresIn).toBe(900);
      expect(result.user).toEqual({
        id: 'u1',
        username: 'magnus',
        email: 'magnus@example.com',
        avatarUrl: null,
        isAdmin: false,
      });
    });
  });

  describe('login', () => {
    it('bumps lastSeenAt and issues tokens signed with sub and username', async () => {
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        id: 'u1',
        username: 'magnus',
        email: 'magnus@example.com',
        avatarUrl: null,
        isAdmin: false,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { lastSeenAt: expect.any(Date) },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'u1', username: 'magnus' });
      expect(result.accessToken).toBe('signed-access-token');
    });

    it('stores only a sha256 hash of the refresh token, expiring in 7 days', async () => {
      prisma.user.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const before = Date.now();
      const result = await service.login({
        id: 'u1',
        username: 'magnus',
        email: 'magnus@example.com',
        avatarUrl: null,
        isAdmin: false,
      });

      const stored = prisma.refreshToken.create.mock.calls[0][0].data;
      expect(stored.userId).toBe('u1');
      expect(stored.tokenHash).toBe(sha256(result.refreshToken));
      expect(stored.tokenHash).not.toBe(result.refreshToken);

      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      expect(stored.expiresAt.getTime() - before).toBeGreaterThan(sevenDaysMs - 60_000);
      expect(stored.expiresAt.getTime() - before).toBeLessThan(sevenDaysMs + 60_000);
    });
  });

  describe('refresh', () => {
    const storedToken = {
      id: 'rt1',
      revoked: false,
      expiresAt: new Date(Date.now() + 86_400_000),
      user: dbUser,
    };

    it('rejects tokens with no matching non-revoked hash', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(null);

      await expect(service.refresh('bogus')).rejects.toThrow('Invalid refresh token');
      expect(prisma.refreshToken.findFirst).toHaveBeenCalledWith({
        where: { tokenHash: sha256('bogus'), revoked: false },
        include: { user: true },
      });
    });

    it('revokes and rejects expired tokens', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(Date.now() - 1000),
      });
      prisma.refreshToken.update.mockResolvedValue({});

      await expect(service.refresh('old-token')).rejects.toThrow('Refresh token expired');
      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revoked: true },
      });
    });

    it('rotates the token: revokes the old one and issues a brand new pair', async () => {
      prisma.refreshToken.findFirst.mockResolvedValue(storedToken);
      prisma.refreshToken.update.mockResolvedValue({});
      prisma.refreshToken.create.mockResolvedValue({});

      const result = await service.refresh('valid-token');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 'rt1' },
        data: { revoked: true },
      });
      const newHash = prisma.refreshToken.create.mock.calls[0][0].data.tokenHash;
      expect(newHash).toBe(sha256(result.refreshToken));
      expect(newHash).not.toBe(sha256('valid-token'));
      expect(result.user.id).toBe('u1');
    });
  });

  describe('logout', () => {
    it('revokes every active refresh token for the user', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({});

      await service.logout('u1');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revoked: false },
        data: { revoked: true },
      });
    });
  });
});
