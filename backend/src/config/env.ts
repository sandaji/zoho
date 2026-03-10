import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),
  
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  HOST: z.string().default('localhost'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  CORS_CREDENTIALS: z.coerce.boolean().default(true),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE: z.string().default('logs/app.log'),
  
  // File Upload
  MAX_FILE_SIZE: z.coerce.number().default(10485760),
  UPLOAD_DIR: z.string().default('uploads'),
  
  // Security
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  SESSION_SECRET: z.string().min(32),
  
  // API
  API_VERSION: z.string().default('v1'),
  API_PREFIX: z.string().default('/api'),
  
  // Development
  DEBUG: z.coerce.boolean().default(false),
  SWAGGER_ENABLED: z.coerce.boolean().default(false),
  PRISMA_STUDIO_PORT: z.coerce.number().default(5555),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(
        `Environment validation failed:\n${errorMessages}\n\n` +
        `Please check your .env file and ensure all required variables are set correctly.`
      );
    }
    throw error;
  }
}

export const env = validateEnv();