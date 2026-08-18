// backend/src/lib/prisma.ts
import "dotenv/config";
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from "../generated";

// Use DIRECT_URL for application runtime when using custom adapter
// The custom PrismaPg adapter has issues with Prisma Cloud's connection pooler
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL!;

const adapter = new PrismaPg({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

const prisma = new PrismaClient({ adapter })

export { prisma }