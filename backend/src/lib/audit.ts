/**
 * Audit Logging Utility
 * Specialized for logging system actions to the AuditLog table
 */

import { prisma } from "./db";
import { logger } from "./logger";

interface AuditOptions {
    entityType: string;
    entityId: string;
    action: "CREATE" | "UPDATE" | "DELETE";
    userId: string;
    changes?: any;
}

/**
 * Log an action to the AuditLog table
 */
export async function logAudit(options: AuditOptions): Promise<void> {
    try {
        const { entityType, entityId, action, userId, changes } = options;

        await prisma.auditLog.create({
            data: {
                entityType,
                entityId,
                action,
                userId,
                // We assume the schema expects changes as JSON or string
                // If it's a JSON field, pass directly; if string, stringify
                changes,

            },
        });

        logger.debug(
            { entityType, entityId, action, userId },
            "Audit log created"
        );
    } catch (error) {
        logger.error({ err: error, options }, "Failed to create audit log");
        // We don't throw here to avoid failing the main transaction if logging fails
        // unless strictly required by business logic. Usually auditing is best-effort or
        // handled within the same transaction.
    }
}
