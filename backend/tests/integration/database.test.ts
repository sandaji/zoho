import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { setupTestDatabase, teardownTestDatabase } from '../setup/database';
import { prisma } from '../setup/database';

describe('Database Connection', () => {
  let testDatabaseUrl: string;

  beforeAll(async () => {
    const setup = await setupTestDatabase();
    testDatabaseUrl = setup.testDatabaseUrl;
  });

  afterAll(async () => {
    await teardownTestDatabase(testDatabaseUrl);
  });

  it('should connect to the test database', async () => {
    await expect(prisma.$connect()).resolves.not.toThrow();
  });

  it('should disconnect from the test database', async () => {
    await prisma.$connect();
    await expect(prisma.$disconnect()).resolves.not.toThrow();
  });

  it('should be able to query the database', async () => {
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });
});