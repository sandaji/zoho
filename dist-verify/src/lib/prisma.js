"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// backend/src/lib/prisma.ts
require("dotenv/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("../generated/client");
const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new adapter_pg_1.PrismaPg({ connectionString });
const prisma = new client_1.PrismaClient({ adapter });
exports.prisma = prisma;
