import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const password = await bcrypt.hash('password123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        username: 'alice',
        email: 'alice@example.com',
        passwordHash: password,
        emailVerified: true,
        ratings: {
          create: [
            { timeControl: 'bullet', rating: 1650 },
            { timeControl: 'blitz', rating: 1700 },
            { timeControl: 'rapid', rating: 1750 },
            { timeControl: 'classical', rating: 1800 },
          ],
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        username: 'bob',
        email: 'bob@example.com',
        passwordHash: password,
        emailVerified: true,
        ratings: {
          create: [
            { timeControl: 'bullet', rating: 1200 },
            { timeControl: 'blitz', rating: 1250 },
            { timeControl: 'rapid', rating: 1300 },
            { timeControl: 'classical', rating: 1350 },
          ],
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'admin@chesskernel.com' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@chesskernel.com',
        passwordHash: password,
        emailVerified: true,
        isAdmin: true,
        ratings: {
          create: [
            { timeControl: 'bullet' },
            { timeControl: 'blitz' },
            { timeControl: 'rapid' },
            { timeControl: 'classical' },
          ],
        },
      },
    }),
  ]);

  console.log(`Seeded ${users.length} users.`);
  console.log('Credentials: any@example.com / password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
