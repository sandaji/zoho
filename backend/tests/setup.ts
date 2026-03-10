import { jest, beforeAll, afterAll } from '@jest/globals';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-minimum-32-characters-long';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://username:password@localhost:5432/zoho_erp_test';

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
} as any;

// Global test setup
beforeAll(async () => {
  // Add any global setup here
});

afterAll(async () => {
  // Add any global cleanup here
});

// Increase timeout for integration tests
jest.setTimeout(30000);