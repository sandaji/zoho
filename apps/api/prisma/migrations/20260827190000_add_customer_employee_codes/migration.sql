-- Customer codes: admin-configurable 2-letter prefix + auto-incrementing
-- 6-digit number (e.g. "AB000001").

CREATE TABLE "customer_code_settings" (
    "id" TEXT NOT NULL,
    "prefix" VARCHAR(2) NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_code_settings_pkey" PRIMARY KEY ("id")
);

-- Seed a default row so the app has something to increment from on first
-- use. Admin can change the prefix afterward from Settings.
INSERT INTO "customer_code_settings" ("id", "prefix", "next_number", "createdAt", "updatedAt")
VALUES ('default_customer_code_setting', 'CU', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "customers" ADD COLUMN "code" TEXT;

-- Backfill existing customers with a temporary unique code (prefix "ZZ")
-- so the column can be made NOT NULL + UNIQUE without colliding with
-- codes issued going forward under whatever prefix the admin chooses.
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "customers"
)
UPDATE "customers" c
SET "code" = 'ZZ' || LPAD(numbered.rn::text, 6, '0')
FROM numbered
WHERE c."id" = numbered."id";

ALTER TABLE "customers" ALTER COLUMN "code" SET NOT NULL;
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- Departments: HR-managed prefix + auto-incrementing employee number,
-- independent per department (e.g. JS001, SS001, SA001).

CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" VARCHAR(2) NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");
CREATE UNIQUE INDEX "departments_prefix_key" ON "departments"("prefix");
CREATE INDEX "departments_isActive_idx" ON "departments"("isActive");

ALTER TABLE "users" ADD COLUMN "employee_code" TEXT;
ALTER TABLE "users" ADD COLUMN "department_id" TEXT;

CREATE UNIQUE INDEX "users_employee_code_key" ON "users"("employee_code");
CREATE INDEX "users_department_id_idx" ON "users"("department_id");

ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey"
  FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
