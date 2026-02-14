import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { logger } from './logger'
import { PrismaClient, Prisma } from '../generated'
import { getRequestContext } from './async-context'

interface CustomPrismaClient extends Omit<PrismaClient, '$on'>  {
  attendance: any;
  $on(eventType: 'query', callback: (event: Prisma.QueryEvent) => void): void;
  $on(eventType: 'info', callback: (event: Prisma.LogEvent) => void): void;
  $on(eventType: 'warn', callback: (event: Prisma.LogEvent) => void): void;
  $on(eventType: 'error', callback: (event: Prisma.LogEvent) => void): void;
  $use(middleware: (params: any, next: (params: any) => Promise<any>) => Promise<any>): void;
}

declare global {
  var prismaGlobal: CustomPrismaClient | undefined
}

function createPrismaClient(): CustomPrismaClient {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is missing from environment variables.')
  }

  // Configure Pool
  const pool = new Pool({ 
    connectionString,
    ssl: { rejectUnauthorized: false } 
  })

  // Create Adapter
  const adapter = new PrismaPg(pool)

  // FIX 2: Initialize standard Client without generics
  const client = new PrismaClient({
    adapter, 
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
    ],
  }) as unknown as CustomPrismaClient 
  // ^ FIX 3: Cast to our custom interface. This forces TS to accept the log events.

  // Audit Log Extension
  const extendedClient = client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (model === 'AuditLog') {
            return query(args);
          }
          
          // Only log CUD operations on single records for now
          if (!['create', 'update', 'delete'].includes(operation)) {
              return query(args);
          }

          let before;
          if (operation === 'update' || operation === 'delete') {
            try {
              // @ts-ignore
              before = await prisma[model].findUnique({ where: args.where });
            } catch (e) {
               // failed to find before, maybe doesn't exist or composite key issue
            }
          }
          
          const result = await query(args);

          let after;
          if (operation === 'create' || operation === 'update') {
            after = result;
          }

          const changes = { before: before || null, after: after || null };
          // result usually has id. If not, try args.
          const entityId = (result as any)?.id || (args as any).where?.id;
          
          if(entityId) {
              const context = getRequestContext();
              // Async logging - don't await to avoid blocking? 
              // Better to await to ensure it's captured in this request context? 
              // We'll await for now for safety.
              try {
                // @ts-ignore
                await prisma.auditLog.create({
                  data: {
                    entityType: model ?? 'Unknown',
                    entityId: entityId,
                    action: operation.toUpperCase() as any,
                    changes,
                    userId: context.userId || null,
                    ipAddress: context.ipAddress || null,
                  }
                });
              } catch(e) {
                 logger.error({ err: e }, "Failed to create audit log");
              }
          }

          return result;
        }
      }
    }
  });

  // Logging (attach to base client)
  if (process.env.NODE_ENV === 'development') {
    client.$on('query', (e) => {
      logger.debug({ duration: `${e.duration}ms`, query: e.query }, "DB Query")
    })
  }

  client.$on('error', (e) => {
    logger.error({ target: e.target }, `Prisma Error: ${e.message}`)
  })

  client.$on('warn', (e) => {
    logger.warn({ target: e.target }, `Prisma Warning: ${e.message}`)
  })

  client.$on('info', (e) => {
    logger.info({ target: e.target }, `Prisma Info: ${e.message}`)
  })

  return extendedClient as unknown as CustomPrismaClient;
}

export const prisma =
  globalThis.prismaGlobal ?? (globalThis.prismaGlobal = createPrismaClient())