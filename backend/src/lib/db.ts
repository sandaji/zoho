//backend/src/lib/db.ts
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

const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "secret",
  "apiKey",
];

/**
 * Strips sensitive fields from data before logging
 * Also converts Prisma Decimal objects to strings for JSON serialization
 */
function redact(data: any): any {
  if (!data) return data;
  if (typeof data !== "object") return data;

  // Handle Prisma Decimal objects
  if (data.constructor?.name === "Decimal" || (typeof data.s === "number" && typeof data.e === "number" && Array.isArray(data.d))) {
    return data.toString();
  }

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
  // Use DIRECT_URL for application runtime when using custom adapter
  // The custom PrismaPg adapter has issues with Prisma Cloud's connection pooler
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DIRECT_URL or DATABASE_URL is missing from environment variables.");
  }

  // Strip sslmode from URL — we handle SSL explicitly via the ssl object below
  const parsedUrl = new URL(connectionString);
  parsedUrl.searchParams.delete('sslmode');
  const cleanConnectionString = parsedUrl.toString();

  const pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: false },
    max: 50,
    min: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
    statement_timeout: 30000,
    query_timeout: 30000,
    // Without TCP keepalive, an idle pooled connection can be silently
    // dropped by a NAT/firewall or the DB provider's own infra (this is a
    // managed Postgres at db.prisma.io) without either side sending a
    // close/FIN. pg only discovers the socket is dead the next time a
    // query tries to use it, surfacing as "Server has closed the
    // connection" / "Connection terminated unexpectedly" on whatever
    // request happened to grab that connection next. keepAlive makes the
    // OS periodically probe idle connections so dead ones get evicted
    // and replaced before a real request ever touches them.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  // node-postgres requires an error listener directly on the Pool: idle
  // clients that hit a backend error emit 'error' on the pool, and with no
  // listener that becomes an unhandled exception. This just logs and lets
  // the pool evict/replace the dead client on its own, instead of crashing
  // the process.
  pool.on("error", (err) => {
    logger.error({ err }, "Postgres pool error (idle client)");
  });

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
          const isSuperAdmin =
            context.role === "admin" || context.role === "super_admin";

          // ─── 1. BRANCH ISOLATION ──────────────────────────────────────────
          // Automatically inject branchId filter for scoped models if not super admin
          const isolationPath = ISOLATION_CONFIGS[model as string];
          if (
            context.branchId &&
            !isSuperAdmin &&
            model !== "AuditLog" &&
            isolationPath
          ) {
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
              const argsAny = args as any;
              argsAny.where = argsAny.where || {};
              applyIsolation(argsAny.where, isolationPath, context.branchId);
            }
          }

          // ─── 2. AUDIT LOGGING ─────────────────────────────────────────────
          if (model === "AuditLog") {
            return query(args);
          }

          // DocumentSequence is a high-frequency internal counter (incremented
          // on every document create, inside a Serializable transaction).
          // Auditing it triples the queries that transaction needs to commit
          // (before-fetch + write + auditLog.create) with no real audit value,
          // which was causing P2028 "Unable to start a transaction" errors
          // under concurrent load. Skip audit logging for it.
          if (model === "DocumentSequence") {
            const { omit, ...cleanArgs } = args as any;
            return query(cleanArgs);
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
                  ...(context.userId
                    ? {
                        user: {
                          connect: { id: context.userId },
                        },
                      }
                    : {}),
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
