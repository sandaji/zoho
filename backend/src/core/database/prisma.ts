// backend/src/lib/prisma.ts
//
// DEPRECATED / UNUSED — kept only so a stray import doesn't silently get a
// bare, unwrapped PrismaClient. The real client (branch isolation +
// audit-logging middleware, tuned connection pool with keepalive) lives in
// `./db.ts` and is what every module in this codebase actually imports.
// This file previously constructed its own separate, unextended
// PrismaClient with none of that middleware and a different pool config —
// nothing currently imports it, but if something ever does by mistake
// (easy given the near-identical filename), it would silently bypass
// branch isolation and the audit trail. Re-exporting the real client here
// instead closes that gap either way.
export { prisma } from "./db";
