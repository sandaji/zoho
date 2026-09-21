//backend/src/lib/db.ts
import { Prisma, PrismaClient } from "@/generated";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { logger } from "../utils/logger";
import { getRequestContext } from "../async-context";

// Kill switch. Branch isolation was written but never actually took effect
// (the request context was populated before authentication — see
// core/middleware/auth.ts), so turning it on is a real behaviour change. Set
// BRANCH_ISOLATION=off in .env to disable it without a code change.
const ISOLATION_ENABLED = process.env.BRANCH_ISOLATION !== "off";

// Holding this permission (on any assigned role) exempts a user from branch
// isolation: head-office / oversight roles see every branch. Granted from the
// admin Roles screen like any other permission.
const CROSS_BRANCH_PERMISSION = "org.branches.view_all";

// Models filtered by a single path to a branch column.
const ISOLATION_CONFIGS: Record<string, string> = {
  // Stock & sales
  Warehouse: "branchId",
  BranchInventory: "branchId",
  SalesDocument: "branchId",
  SalesOrder: "branchId",
  CashierSession: "branchId",
  Inventory: "warehouse.branchId",
  StockMovement: "warehouse.branchId",
  DispatchNote: "salesOrder.branchId",
  Payment: "salesDocument.branchId",

  // People
  User: "branchId",
  Payroll: "user.branchId",
  LeaveRequest: "user.branchId",
  PerformanceEvaluation: "user.branchId",

  // Procurement
  PurchaseOrder: "branchId",
  PurchaseRequisition: "branchId",
  GoodsReceiptNote: "purchaseOrder.branchId",

  // Finance. Rows with a NULL branch (head-office / consolidated entries) are
  // deliberately invisible to branch users.
  ExpenseReport: "branchId",
  JournalHeader: "branch_id",
  JournalLine: "header.branch_id",
  VATTransaction: "branch_id",
  // NOTE: FinanceTransaction has no branch column, so this only matches rows
  // that came from payroll — everything else is hidden from branch users
  // (fails closed). It needs a real branchId column; see the branch-finance plan.
  FinanceTransaction: "payroll.user.branchId",
};

// Models whose branch link can't be expressed as one path.
const CUSTOM_ISOLATION: Record<string, (branchId: string) => any> = {
  // A transfer belongs to BOTH the branch it leaves and the one it arrives at.
  // (It used to be listed above as "branchId", a column StockTransfer doesn't
  // have, which would have thrown for every non-admin once isolation worked.)
  StockTransfer: (branchId) => ({
    OR: [
      { sourceWarehouse: { branchId } },
      { destinationWarehouse: { branchId } },
    ],
  }),
};

const ISOLATED_OPERATIONS = [
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "aggregate",
  "groupBy",
];

// Reference data that every branch must be able to READ — e.g. picking the
// source warehouse of an inter-branch transfer request — while writes stay
// isolated to the owning branch.
//
// DocumentSequence is deliberately NOT isolated at all: it's an internal counter
// always addressed by an explicit (branchId, type) key, and cross-branch
// documents (a transfer request numbers itself on the SOURCE branch) need to
// reach another branch's counter. Isolating it protects nothing and would break
// those documents.
const READ_OPEN_MODELS = new Set(["Warehouse"]);
const READ_OPERATIONS = [
  "findMany",
  "findFirst",
  "findFirstOrThrow",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
];

/** Deeply applies a branch isolation filter to a Prisma where clause */
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

/** ANDs an extra filter into a where clause without clobbering existing AND/OR. */
function addAndFilter(where: any, filter: any) {
  if (Array.isArray(where.AND)) {
    where.AND = [...where.AND, filter];
  } else if (where.AND) {
    where.AND = [where.AND, filter];
  } else {
    where.AND = [filter];
  }
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
  if (
    data.constructor?.name === "Decimal" ||
    (typeof data.s === "number" &&
      typeof data.e === "number" &&
      Array.isArray(data.d))
  ) {
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
    throw new Error(
      "DIRECT_URL or DATABASE_URL is missing from environment variables.",
    );
  }

  // Strip sslmode from URL — we handle SSL explicitly via the ssl object below
  const parsedUrl = new URL(connectionString);
  parsedUrl.searchParams.delete("sslmode");
  const cleanConnectionString = parsedUrl.toString();

  const pool = new Pool({
    connectionString: cleanConnectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    min: 2,
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
          // Confine branch users to their own branch's rows. Exempt: admin /
          // super_admin, and anyone holding org.branches.view_all (head office).
          const isolationPath = ISOLATION_CONFIGS[model as string];
          const customIsolation = CUSTOM_ISOLATION[model as string];
          if (
            ISOLATION_ENABLED &&
            context.branchId &&
            !isSuperAdmin &&
            model !== "AuditLog" &&
            (isolationPath || customIsolation) &&
            ISOLATED_OPERATIONS.includes(operation) &&
            !(
              READ_OPEN_MODELS.has(model as string) &&
              READ_OPERATIONS.includes(operation)
            )
          ) {
            const crossBranch = context.userId
              ? await userHasCrossBranchAccess(context.userId)
              : false;

            if (!crossBranch) {
              const argsAny = args as any;
              argsAny.where = argsAny.where || {};
              if (isolationPath) {
                applyIsolation(argsAny.where, isolationPath, context.branchId);
              } else if (customIsolation) {
                addAndFilter(argsAny.where, customIsolation(context.branchId));
              }
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

// Cross-branch (head-office) access.
// Cached briefly so a burst of queries in one request (or many requests) costs
// one lookup, not one per query. A role change takes effect within the TTL.
const CROSS_BRANCH_TTL_MS = 30_000;
const crossBranchCache = new Map<string, { at: number; value: boolean }>();

/**
 * True when any of the user's roles carries `org.branches.view_all`.
 * Fails closed: on any lookup error the user is treated as branch-restricted.
 */
export async function userHasCrossBranchAccess(userId: string): Promise<boolean> {
  const hit = crossBranchCache.get(userId);
  if (hit && Date.now() - hit.at < CROSS_BRANCH_TTL_MS) return hit.value;

  try {
    const row = await prisma.roleAssignment.findFirst({
      where: {
        userId,
        role: {
          permissions: {
            some: { permission: { code: CROSS_BRANCH_PERMISSION } },
          },
        },
      },
      select: { userId: true },
    });
    const value = row !== null;
    crossBranchCache.set(userId, { at: Date.now(), value });
    return value;
  } catch (error) {
    logger.error({ userId, err: error }, "Cross-branch access lookup failed");
    return false;
  }
}

/** Drop cached cross-branch decisions (e.g. right after a role/permission change). */
export function clearCrossBranchCache(userId?: string) {
  if (userId) crossBranchCache.delete(userId);
  else crossBranchCache.clear();
}
