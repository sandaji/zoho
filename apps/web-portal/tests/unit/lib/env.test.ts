import { render, screen } from '@testing-library/react';
import { describe, it, expect } from '@jest/globals';
import { validateFrontendEnv } from '@/lib/env';

describe('Frontend Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset process.env before each test
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    // Restore original process.env
    process.env = originalEnv;
  });

  it('should validate frontend environment variables', () => {
    // Set required environment variables for testing
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001/api';

    expect(() => validateFrontendEnv()).not.toThrow();
  });

  it('should use default values for optional variables', () => {
    // Set required variables
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001/api';

    const env = validateFrontendEnv();
    
    // Check default values
    expect(env.NEXT_PUBLIC_APP_NAME).toBe('Zoho ERP');
    expect(env.NEXT_PUBLIC_DEFAULT_THEME).toBe('light');
    expect(env.NEXT_PUBLIC_DEBUG).toBe(false);
  });

  it('should handle missing optional variables gracefully', () => {
    // Set only required variables
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001';
    process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:3001/api';

    expect(() => validateFrontendEnv()).not.toThrow();
  });
});