import { PrismaClient } from '../../src/generated';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient;

export async function setupTestDatabase() {
  // Use TEST_DATABASE_URL if available, otherwise fall back to DATABASE_URL
  // For Prisma Cloud, use a dedicated test database schema instead of creating/dropping databases
  const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL is not defined');
  }

  // Create test database adapter
  const pool = new Pool({ 
    connectionString: testDatabaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);

  // Create new Prisma client for test database
  prisma = new PrismaClient({
    adapter,
  });

  // For Prisma Cloud, we don't run migrations here
  // Migrations should be applied to the test database separately
  // or use a dedicated test database that's already migrated

  return { prisma, testDatabaseUrl };
}

export async function teardownTestDatabase(testDatabaseUrl: string) {
  if (prisma) {
    await prisma.$disconnect();
  }

  // For Prisma Cloud, we don't drop databases
  // Tests should clean up their own data within transactions
}

export { prisma };