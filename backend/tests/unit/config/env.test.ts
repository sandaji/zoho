import { describe, it, expect } from '@jest/globals';
import { validateEnv } from '../../src/config/env';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  it('should validate required environment variables', () => {
    // Set required environment variables for testing
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-validation';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-that-is-long-enough';
    process.env.SESSION_SECRET = 'test-session-secret-key-that-is-long-enough';

    expect(() => validateEnv()).not.toThrow();
  });

  it('should throw error for missing required variables', () => {
    // Remove required environment variables
    delete process.env.DATABASE_URL;
    delete process.env.JWT_SECRET;

    expect(() => validateEnv()).toThrow('Environment validation failed');
  });

  it('should use default values for optional variables', () => {
    // Set required variables
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test';
    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-validation';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-that-is-long-enough';
    process.env.SESSION_SECRET = 'test-session-secret-key-that-is-long-enough';

    const env = validateEnv();
    
    // Check default values
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe('3001');
    expect(env.LOG_LEVEL).toBe('info');
  });
});