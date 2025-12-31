# Adding Authentication to Prisma Schema

This guide helps you add the User model to your existing Prisma schema for JWT authentication.

## Step 1: Update `prisma/schema.prisma`

Add the User model to your schema:

```prisma
// This file is committed to the repository
// This line should *not* be modified. If you want to run migrations in this workspace you'll need to set the `skipEngine` property to false in a global ENV variable.
// See https://www.prisma.io/docs/reference/api-reference/environment-variables-reference#prisma_migrate_skip_engine for more details.
// prisma-client-js

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER & AUTHENTICATION
// ============================================================================

model User {
  id            String   @id @default(cuid())
  email         String   @unique @db.VarChar(255)
  passwordHash  String   @db.Text
  name          String   @db.VarChar(255)
  role          String   @default("user") @db.VarChar(50)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Indexes for performance
  @@index([email])
  @@index([role])
}

// ============================================================================
// OTHER MODELS (Your existing models continue below)
// ============================================================================

// Add your existing models here...
```

## Step 2: Create Migration

Run the migration command:

```bash
cd backend
npm run db:migrate -- --name add_user_authentication
```

This will:

1. Create the migration file in `prisma/migrations/`
2. Apply the migration to your database
3. Generate Prisma Client types

## Step 3: Verify the Migration

Check that the User table was created:

```bash
npm run db:studio
```

Open Prisma Studio and verify the new `User` table exists with columns:

- id
- email (unique)
- passwordHash
- name
- role
- createdAt
- updatedAt

## Step 4: Create a Test User (Optional)

You can manually create a test user using Prisma Studio or via API:

**Using API**:

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "AdminPassword123",
    "name": "Admin User",
    "role": "admin"
  }'
```

**Using Prisma CLI** (if you want to seed the database):

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/common/password";

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await hashPassword("AdminPassword123");
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: adminPassword,
      name: "Admin User",
      role: "admin",
    },
  });

  // Create manager user
  const managerPassword = await hashPassword("ManagerPassword123");
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      email: "manager@example.com",
      passwordHash: managerPassword,
      name: "Manager User",
      role: "manager",
    },
  });

  // Create regular user
  const userPassword = await hashPassword("UserPassword123");
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {},
    create: {
      email: "user@example.com",
      passwordHash: userPassword,
      name: "Regular User",
      role: "user",
    },
  });

  console.log({ admin, manager, user });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
```

Then run:

```bash
npx ts-node prisma/seed.ts
```

## Complete User Model Reference

Here's the full User model with all fields and indexes:

```prisma
model User {
  // Primary Key
  id            String   @id @default(cuid())

  // Authentication
  email         String   @unique @db.VarChar(255)
  passwordHash  String   @db.Text

  // User Profile
  name          String   @db.VarChar(255)
  role          String   @default("user") @db.VarChar(50)

  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Indexes
  @@index([email])     // Fast lookup by email
  @@index([role])      // Fast lookup by role
}
```

## Troubleshooting

### Migration failed with "relation does not exist"

**Solution**: Ensure your DATABASE_URL is correct and PostgreSQL is running.

### "Field 'passwordHash' is required but not provided"

**Solution**: Make sure you're using the exact field names from the schema.

### Can't connect to database

**Solution**:

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check DATABASE_URL in `.env`
3. Test connection: `psql <DATABASE_URL>`

### Migration already exists

**Solution**:

1. If you made a mistake, you can reset: `npm run db:reset`
2. Or manually delete the migration and recreate

---

## Next Steps

1. ✅ Add User model to schema.prisma
2. ✅ Run `npm run db:migrate`
3. ✅ Verify table exists in Prisma Studio
4. ✅ (Optional) Seed test users
5. ✅ Start backend: `npm run dev`
6. ✅ Test login endpoint

Your authentication system is now ready to use! 🎉
