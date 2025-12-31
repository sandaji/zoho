# Prisma Migration Quick Reference

## 🚀 Essential Commands

### Initial Setup

```bash
# 1. Install dependencies
npm install

# 2. Create initial migration
npm run db:migrate -- --name init_erp_schema

# This runs:
# - prisma migrate dev --name init_erp_schema
# - Generates migration file
# - Creates tables in database
# - Generates Prisma Client
```

### Daily Development

```bash
# Start dev server
npm run dev --workspace=backend

# Make schema changes, then:
npm run db:migrate -- --name describe_change

# View and edit data
npm run db:studio

# Type check (catches errors early)
npm run type-check --workspace=backend
```

### After Pull/Merge

```bash
# Apply pending migrations
npm run db:push

# Or view status first
npx prisma migrate status
```

### Schema Validation

```bash
# Format schema file
npx prisma format

# Validate syntax
npx prisma validate

# Regenerate Prisma Client
npx prisma generate
```

### Production Deployment

```bash
# Check pending migrations
prisma migrate status

# Apply migrations (no prompts)
prisma migrate deploy

# Verify
prisma validate
```

### Reset (Development Only)

```bash
# WARNING: Deletes all data!
npm run db:reset

# Creates new database + runs all migrations
```

---

## 📋 Command Details

### `npm run db:migrate`

**What it does**:

- Detects schema changes
- Creates migration file
- Applies to database immediately
- Generates Prisma Client

**Usage**:

```bash
npm run db:migrate -- --name add_product_category
```

**Options**:

- `--skip-generate` - Skip Prisma Client generation
- `--skip-seed` - Skip seed file

---

### `npm run db:push`

**What it does**:

- Pushes schema directly to database
- Creates migrations in `prisma/migrations/`
- No interactive prompts

**Usage**:

```bash
npm run db:push
```

**When to use**:

- Development iteration
- After pulling migrations
- Quick testing

---

### `npm run db:studio`

**What it does**:

- Opens Prisma Studio UI
- View and edit database records
- Query builder

**Usage**:

```bash
npm run db:studio
# Opens http://localhost:5555
```

---

### `npm run db:reset`

**What it does**:

- Drops entire database
- Recreates from scratch
- Runs all migrations
- Runs seed.ts if exists

**Usage**:

```bash
npm run db:reset
```

**⚠️ WARNING**: Deletes all data! Development only.

---

### `npx prisma format`

**What it does**:

- Auto-formats schema.prisma
- Fixes indentation
- Organizes fields

**Usage**:

```bash
npx prisma format
```

---

### `npx prisma validate`

**What it does**:

- Checks schema syntax
- Validates relationships
- Reports errors

**Usage**:

```bash
npx prisma validate
```

---

### `npx prisma generate`

**What it does**:

- Regenerates Prisma Client
- Runs automatically on migrate/push

**Usage**:

```bash
npx prisma generate
```

**When needed**:

- After upgrading Prisma
- Manual Prisma Client refresh

---

### `npx prisma migrate status`

**What it does**:

- Shows pending migrations
- Compares local vs database
- Detects conflicts

**Usage**:

```bash
npx prisma migrate status
```

**Output example**:

```
Following migrations have not yet been applied:
  └─ 20251112123456_add_product_category.sql

Your database is behind!
```

---

### `npx prisma migrate deploy`

**What it does**:

- Applies migrations in order
- Non-interactive (production-safe)
- Fails if conflicts detected

**Usage**:

```bash
npx prisma migrate deploy
```

**When to use**:

- Production deployment
- CI/CD pipeline
- Automated deployments

---

### `npx prisma migrate resolve`

**What it does**:

- Resolves migration conflicts
- Marks migrations as applied

**Usage**:

```bash
npx prisma migrate resolve --applied "20251112123456_add_product_category"
```

---

### `npx prisma migrate diff`

**What it does**:

- Compares two schema states
- Shows what changed

**Usage**:

```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datasource prisma/schema.prisma
```

---

## 🔄 Common Workflows

### Adding a New Field to User

**Step 1**: Edit schema

```prisma
model User {
  // ... existing fields
  department String?  // Add this line
}
```

**Step 2**: Create migration

```bash
npm run db:migrate -- --name add_user_department
```

**Step 3**: Verify in Prisma Studio

```bash
npm run db:studio
```

---

### Creating a New Model

**Step 1**: Add model to schema

```prisma
model Department {
  id        String    @id @default(cuid())
  name      String    @unique
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  @@map("departments")
}
```

**Step 2**: Create migration

```bash
npm run db:migrate -- --name create_department_model
```

**Step 3**: Update code to use it

```typescript
const dept = await prisma.department.create({
  data: { name: "Sales" },
});
```

---

### Adding a Relationship

**Step 1**: Update schema with foreign key

```prisma
model User {
  // ... existing
  departmentId String
  department Department @relation(fields: [departmentId], references: [id])
}

model Department {
  // ... existing
  users User[]
}
```

**Step 2**: Create migration

```bash
npm run db:migrate -- --name link_users_to_departments
```

---

### Renaming a Field

**Step 1**: Edit schema with `@rename`

```prisma
model Product {
  // Old: unit_price Float
  // New:
  price Float @rename("unit_price")
}
```

**Step 2**: Create migration

```bash
npm run db:migrate -- --name rename_unit_price_to_price
```

---

### Adding a Unique Constraint

**Step 1**: Update schema

```prisma
model Product {
  sku String @unique  // Add unique
}
```

**Step 2**: Create migration

```bash
npm run db:migrate -- --name add_sku_unique_constraint
```

---

### Adding an Index

**Step 1**: Update schema

```prisma
model Sales {
  // ... fields
  @@index([userId])  // Add index
  @@index([status])
}
```

**Step 2**: Create migration

```bash
npm run db:migrate -- --name add_sales_indexes
```

---

## 🐛 Troubleshooting

### "Migration already applied"

```bash
# Check status
npx prisma migrate status

# Verify database is synced
npm run db:push
```

### "Prisma Client is out of sync"

```bash
# Regenerate
npx prisma generate
```

### "Foreign key constraint violation"

**Cause**: Deleting record referenced by another
**Solution**: Check `onDelete` policy

```prisma
@relation(onDelete: Cascade)  // Auto-delete children
@relation(onDelete: SetNull)  // Set to null
@relation(onDelete: Restrict) // Prevent deletion
```

### "Failed to reach database"

```bash
# Check database is running
docker-compose up -d

# Check DATABASE_URL in .env
cat backend/.env

# Test connection
npx prisma db push
```

### "Cannot migrate, schema already in database"

```bash
# Development: Reset
npm run db:reset

# Production: Check migrations manually
npx prisma migrate status
```

---

## 📊 Migration File Structure

Generated migration files (`prisma/migrations/*/migration.sql`):

```sql
-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('cashier', 'warehouse_staff', 'driver', 'manager', 'admin');

-- CreateTable
CREATE TABLE "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "user_role" NOT NULL DEFAULT 'cashier',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "users_branchId_idx" ON "users"("branchId");
```

---

## 🔒 Production Checklist

Before deploying migrations:

- [ ] Test migrations locally
- [ ] Review migration SQL files
- [ ] Check for data loss risks
- [ ] Backup production database
- [ ] Run `prisma migrate deploy`
- [ ] Verify data integrity
- [ ] Monitor application logs

---

## 📚 Useful Resources

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Migration Workflows](https://www.prisma.io/docs/concepts/components/prisma-migrate/team-flows)
- [Troubleshooting Migrate](https://www.prisma.io/docs/reference/api-reference/command-reference#migrate-dev)

---

## 🎯 Quick Command Reference

| Task              | Command                             |
| ----------------- | ----------------------------------- |
| Create migration  | `npm run db:migrate -- --name name` |
| Apply pending     | `npm run db:push`                   |
| View data         | `npm run db:studio`                 |
| Reset DB          | `npm run db:reset`                  |
| Format schema     | `npx prisma format`                 |
| Validate schema   | `npx prisma validate`               |
| Check status      | `npx prisma migrate status`         |
| Deploy (prod)     | `npx prisma migrate deploy`         |
| Regenerate client | `npx prisma generate`               |
| Resolve conflict  | `npx prisma migrate resolve`        |

---

**Created**: November 12, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
