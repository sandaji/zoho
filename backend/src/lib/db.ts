import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { logger } from "./logger";
import { PrismaClient, Prisma } from "../generated";
import { getRequestContext } from "./async-context";

const ISOLATION_CONFIGS: Record<string, string> = {
  Warehouse: "branchId",
  BranchInventory: "branchId",
  SalesDocument: "branchId",
  SalesOrder: "branchId",
  StockTransfer: "branchId",
  DocumentSequence: "branchId",
  CashierSession: "branchId",
  User: "branchId",
  Payroll: "user.branchId",
  LeaveRequest: "user.branchId",
  PerformanceEvaluation: "user.branchId",
  Inventory: "warehouse.branchId",
  StockMovement: "warehouse.branchId",
  FinanceTransaction: "payroll.user.branchId",
};

/**
 * Deeply applies a branch isolation filter to a Prisma where clause
 */
function applyIsolation(where: any, path: string, branchId: string) {
  const parts = path.split(".");
  let current = where;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof current[part] !== "object" || current[part] === null) {
      current[part] = {};
    }
    current = current[part];
  }

  const finalKey = parts[parts.length - 1];
  current[finalKey] = branchId;
}

const SENSITIVE_FIELDS = ["password", "passwordHash", "token", "secret", "apiKey"];

/**
 * Strips sensitive fields from data before logging
 */
function redact(data: any): any {
  if (!data) return data;
  if (typeof data !== "object") return data;
  
  const clean = Array.isArray(data) ? [...data] : { ...data };
  
  for (const key in clean) {
    if (SENSITIVE_FIELDS.includes(key)) {
      clean[key] = "[REDACTED]";
    } else if (typeof clean[key] === "object") {
      clean[key] = redact(clean[key]);
    }
  }
  
  return clean;
}

interface CustomPrismaClient extends Omit<PrismaClient, "$on"> {
  attendance: any;
  $on(eventType: "query", callback: (event: Prisma.QueryEvent) => void): void;
  $on(eventType: "info", callback: (event: Prisma.LogEvent) => void): void;
  $on(eventType: "warn", callback: (event: Prisma.LogEvent) => void): void;
  $on(eventType: "error", callback: (event: Prisma.LogEvent) => void): void;
  $use(
    middleware: (
      params: any,
      next: (params: any) => Promise<any>,
    ) => Promise<any>,
  ): void;
}

declare global {
  var prismaGlobal: CustomPrismaClient | undefined;
}

function createPrismaClient(): CustomPrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing from environment variables.");
  }

  // Configure Pool with optimized settings
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    // Connection pool configuration
    max: 50, // Max connections in pool (default is 10)
    min: 5, // Min connections to maintain
    idleTimeoutMillis: 30000, // Close idle connections after 30s
    connectionTimeoutMillis: 10000, // Timeout for acquiring a connection
    statement_timeout: 30000, // Query timeout: 30 seconds
    query_timeout: 30000, // Additional query timeout
  });

  // Create Adapter
  const adapter = new PrismaPg(pool);

  // FIX 2: Initialize standard Client without generics
  const client = new PrismaClient({
    adapter,
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "info" },
      { emit: "event", level: "warn" },
    ],
  }) as unknown as CustomPrismaClient;
  // ^ FIX 3: Cast to our custom interface. This forces TS to accept the log events.

  // Extended Client for Audit Logging and Branch Isolation
  const extendedClient = client.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const context = getRequestContext();
          const isSuperAdmin = context.role === "admin" || context.role === "super_admin";

          // ─── 1. BRANCH ISOLATION ──────────────────────────────────────────
          // Automatically inject branchId filter for scoped models if not super admin
          const isolationPath = ISOLATION_CONFIGS[model as string];
          if (context.branchId && !isSuperAdmin && model !== "AuditLog" && isolationPath) {
            const isolationOperations = [
              "findMany",
              "findFirst",
              "findUnique",
              "count",
              "update",
              "updateMany",
              "delete",
              "deleteMany",
              "aggregate",
              "groupBy",
            ];

            if (isolationOperations.includes(operation)) {
              args.where = args.where || {};
              applyIsolation(args.where, isolationPath, context.branchId);
            }
          }

          // ─── 2. AUDIT LOGGING ─────────────────────────────────────────────
          if (model === "AuditLog") {
            return query(args);
          }

          // Only log CUD operations on single records for now
          if (!["create", "update", "delete"].includes(operation)) {
            const { omit, ...cleanArgs } = args as any;
            return query(cleanArgs);
          }

          let before;
          if (operation === "update" || operation === "delete") {
            try {
              // Use the base client to avoid recursive extension calls
              // @ts-ignore
              before = await client[model].findUnique({ where: args.where });
            } catch (e) {
              // failed to find before, maybe doesn't exist or composite key issue
            }
          }

          const { omit, ...cleanArgs } = args as any;
          const result = await query(cleanArgs);

          let after;
          if (operation === "create" || operation === "update") {
            after = result;
          }

          const changes = { before: before || null, after: after || null };
          const entityId = (result as any)?.id || (args as any).where?.id;

          if (entityId) {
            try {
              // @ts-ignore
              await client.auditLog.create({
                data: {
                  entityType: model ?? "Unknown",
                  entityId: entityId,
                  action: operation.toUpperCase() as any,
                  changes: redact({
                    ...changes,
                    businessAction: context.businessAction || null,
                    metadata: context.metadata || null,
                  }),
                  userId: context.userId || null,
                  branchId: context.branchId || null,
                  ipAddress: context.ipAddress || null,
                },
              });
            } catch (e) {
              logger.error({ err: e }, "Failed to create audit log");
            }
          }

          return result;
        },
      },
    },
  });

  // Logging (attach to base client)
  if (process.env.NODE_ENV === "development") {
    client.$on("query", (e) => {
      logger.debug({ duration: `${e.duration}ms`, query: e.query }, "DB Query");
    });
  }

  client.$on("error", (e) => {
    logger.error({ target: e.target }, `Prisma Error: ${e.message}`);
  });

  client.$on("warn", (e) => {
    logger.warn({ target: e.target }, `Prisma Warning: ${e.message}`);
  });

  client.$on("info", (e) => {
    logger.info({ target: e.target }, `Prisma Info: ${e.message}`);
  });

  return extendedClient as unknown as CustomPrismaClient;
}

export const prisma =
  globalThis.prismaGlobal ?? (globalThis.prismaGlobal = createPrismaClient());
