import { PrismaClient } from '../../src/generated';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

let prisma: PrismaClient;

export async function setupTestDatabase() {
  // Generate a unique database URL for this test run
  const testDatabaseUrl = process.env.DATABASE_URL?.replace(
    /\w+$/,
    `test_${randomUUID().replace(/-/g, '_')}`
  );

  if (!testDatabaseUrl) {
    throw new Error('DATABASE_URL is not defined');
  }

  // Create test database
  try {
    execSync(`createdb ${testDatabaseUrl.split('/').pop()}`, { stdio: 'ignore' });
  } catch (error) {
    // Database might already exist, continue
  }

  // Set the test database URL
  process.env.DATABASE_URL = testDatabaseUrl;

  // Create test database adapter
  const pool = new Pool({ connectionString: testDatabaseUrl });
  const adapter = new PrismaPg(pool);

  // Create new Prisma client for test database
  prisma = new PrismaClient({
    adapter,
  });

  // Run migrations
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'inherit'
  });

  return { prisma, testDatabaseUrl };
}

export async function teardownTestDatabase(testDatabaseUrl: string) {
  if (prisma) {
    await prisma.$disconnect();
  }

  // Drop test database
  try {
    const dbName = testDatabaseUrl.split('/').pop();
    execSync(`dropdb ${dbName} --force`, { stdio: 'ignore' });
  } catch (error) {
    console.error('Failed to drop test database:', error);
  }
}

export { prisma };