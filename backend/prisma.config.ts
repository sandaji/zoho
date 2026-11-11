import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// A shadow database is only needed by `prisma migrate dev`; `migrate deploy` never uses it.
// Prisma raises P3025 when the shadow URL points at the same database as the main one (even if the
// URL text differs, e.g. pooled vs direct). So it is opt-in: set USE_SHADOW_DB=1 together with a
// SHADOW_DATABASE_URL that is a different, empty database when you run `migrate dev`.
const useShadow = process.env.USE_SHADOW_DB === "1" && !!process.env.SHADOW_DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DIRECT_URL"),
    ...(useShadow ? { shadowDatabaseUrl: env("SHADOW_DATABASE_URL") } : {}),
  },
});
