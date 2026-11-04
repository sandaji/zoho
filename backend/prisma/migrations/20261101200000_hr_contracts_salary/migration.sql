-- Phase 6: salary structures and employment contracts

CREATE TABLE "salary_structures" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "min_salary" DOUBLE PRECISION,
    "max_salary" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "salary_structures_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "salary_structures_code_key" ON "salary_structures"("code");

CREATE TABLE "salary_components" (
    "id" TEXT NOT NULL,
    "structure_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "calc" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "salary_components_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "salary_components_structure_id_idx" ON "salary_components"("structure_id");

CREATE TABLE "employment_contracts" (
    "id" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "job_title" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "probation_end_date" TIMESTAMP(3),
    "notice_days" INTEGER NOT NULL DEFAULT 30,
    "hours_per_week" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "base_salary" DOUBLE PRECISION NOT NULL,
    "salary_structure_id" TEXT,
    "notes" TEXT,
    "signed_at" TIMESTAMP(3),
    "terminated_at" TIMESTAMP(3),
    "termination_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "employment_contracts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "employment_contracts_contract_number_key" ON "employment_contracts"("contract_number");
CREATE INDEX "employment_contracts_user_id_status_idx" ON "employment_contracts"("user_id", "status");
CREATE INDEX "employment_contracts_status_end_date_idx" ON "employment_contracts"("status", "end_date");
-- At most one ACTIVE contract per employee, enforced by the database
CREATE UNIQUE INDEX "employment_contracts_one_active_per_user" ON "employment_contracts"("user_id") WHERE "status" = 'ACTIVE';
