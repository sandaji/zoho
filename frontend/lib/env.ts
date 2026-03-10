import { z } from 'zod';

const envSchema = z.object({
  // App Configuration
  NEXT_PUBLIC_APP_NAME: z.string().default('Zoho ERP'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:5000'),
  NEXT_PUBLIC_API_VERSION: z.string().default('v1'),

  // API Configuration
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default('http://localhost:5000/v1'),
  NEXT_PUBLIC_AUTH_TOKEN_KEY: z.string().default('auth_token'),
  NEXT_PUBLIC_REFRESH_TOKEN_KEY: z.string().default('zoho-erp-refresh-token'),

  // Features
  NEXT_PUBLIC_ENABLE_ANALYTICS: z.string().default('false').transform(val => val === 'true'),
  NEXT_PUBLIC_ENABLE_ERROR_TRACKING: z.string().default('false').transform(val => val === 'true'),
  NEXT_PUBLIC_ENABLE_SERVICE_WORKER: z.string().default('false').transform(val => val === 'true'),

  // UI Configuration
  NEXT_PUBLIC_DEFAULT_THEME: z.enum(['light', 'dark']).default('light'),
  NEXT_PUBLIC_DEFAULT_LOCALE: z.string().default('en'),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.string().default('KES'),

  // Development
  NEXT_PUBLIC_DEBUG: z.string().default('false').transform(val => val === 'true'),
  NEXT_PUBLIC_MOCK_API: z.string().default('false').transform(val => val === 'true'),

  // File Upload
  NEXT_PUBLIC_MAX_FILE_SIZE: z.string().default('10485760').transform(Number),
  NEXT_PUBLIC_ALLOWED_FILE_TYPES: z.string().default('.jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx'),

  // Cache Configuration
  NEXT_PUBLIC_CACHE_TTL: z.string().default('3600').transform(Number),
  NEXT_PUBLIC_ENABLE_CACHE: z.string().default('true').transform(val => val === 'true'),

  // External Services
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

export type FrontendEnvConfig = z.infer<typeof envSchema>;

export function validateFrontendEnv(): FrontendEnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err =>
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');

      console.error('Frontend environment validation failed:', errorMessages);

      // Return default values for non-critical errors in development
      if (process.env.NODE_ENV === 'development') {
        return envSchema.parse({});
      }

      throw new Error(
        `Frontend environment validation failed:\n${errorMessages}\n\n` +
        `Please check your .env.local file and ensure all required variables are set correctly.`
      );
    }
    throw error;
  }
}

export const frontendEnv = validateFrontendEnv();