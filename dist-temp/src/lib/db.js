"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const logger_1 = require("./logger");
const client_1 = require("../generated/client");
const async_context_1 = require("./async-context");
function createPrismaClient() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error('DATABASE_URL is missing from environment variables.');
    }
    // Configure Pool
    const pool = new pg_1.Pool({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });
    // Create Adapter
    const adapter = new adapter_pg_1.PrismaPg(pool);
    // FIX 2: Initialize standard Client without generics
    const client = new client_1.PrismaClient({
        adapter,
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
        ],
    });
    // ^ FIX 3: Cast to our custom interface. This forces TS to accept the log events.
    // Audit Log Middleware
    client.$use(async (params, next) => {
        if (params.model === 'AuditLog') {
            return next(params);
        }
        // Only log CUD operations on single records for now
        if (!['create', 'update', 'delete'].includes(params.action)) {
            return next(params);
        }
        let before;
        if (params.action === 'update' || params.action === 'delete') {
            // @ts-ignore
            before = await exports.prisma[params.model].findUnique({ where: params.args.where });
        }
        const result = await next(params);
        let after;
        if (params.action === 'create' || params.action === 'update') {
            after = result;
        }
        const changes = { before: before || null, after: after || null };
        const entityId = result.id || params.args.where.id;
        if (entityId) {
            const context = (0, async_context_1.getRequestContext)();
            // @ts-ignore
            await exports.prisma.auditLog.create({
                data: {
                    entityType: params.model ?? 'Unknown',
                    entityId: entityId,
                    action: params.action.toUpperCase(),
                    changes,
                    userId: context.userId || null,
                    ipAddress: context.ipAddress || null,
                }
            });
        }
        return result;
    });
    // Logging
    if (process.env.NODE_ENV === 'development') {
        client.$on('query', (e) => {
            logger_1.logger.debug({ duration: `${e.duration}ms`, query: e.query }, "DB Query");
        });
    }
    client.$on('error', (e) => {
        logger_1.logger.error({ target: e.target }, `Prisma Error: ${e.message}`);
    });
    client.$on('warn', (e) => {
        logger_1.logger.warn({ target: e.target }, `Prisma Warning: ${e.message}`);
    });
    client.$on('info', (e) => {
        logger_1.logger.info({ target: e.target }, `Prisma Info: ${e.message}`);
    });
    return client;
}
exports.prisma = globalThis.prismaGlobal ?? (globalThis.prismaGlobal = createPrismaClient());
