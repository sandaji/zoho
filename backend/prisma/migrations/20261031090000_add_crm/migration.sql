-- CRM: territories, leads, opportunities, interactions, follow-up tasks, sales targets

CREATE TABLE "crm_territories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "branch_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_territories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_territory_members" (
    "id" TEXT NOT NULL,
    "territory_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_territory_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_leads" (
    "id" TEXT NOT NULL,
    "lead_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "source" TEXT NOT NULL DEFAULT 'OTHER',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "territory_id" TEXT,
    "branch_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "converted_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_leads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_opportunities" (
    "id" TEXT NOT NULL,
    "opportunity_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "lead_id" TEXT,
    "customer_id" TEXT,
    "customer_name" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'PROSPECTING',
    "value" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "probability" INTEGER NOT NULL DEFAULT 10,
    "expected_close_date" TIMESTAMP(3),
    "lost_reason" TEXT,
    "closed_at" TIMESTAMP(3),
    "notes" TEXT,
    "territory_id" TEXT,
    "branch_id" TEXT,
    "owner_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_opportunities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_interactions" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'NOTE',
    "subject" TEXT NOT NULL,
    "notes" TEXT,
    "interaction_date" TIMESTAMP(3) NOT NULL,
    "lead_id" TEXT,
    "opportunity_id" TEXT,
    "customer_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_interactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lead_id" TEXT,
    "opportunity_id" TEXT,
    "customer_id" TEXT,
    "assigned_to_id" TEXT NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "crm_sales_targets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "territory_id" TEXT,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "target_amount" DOUBLE PRECISION NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_sales_targets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "crm_territories_name_key" ON "crm_territories"("name");
CREATE INDEX "crm_territories_branch_id_idx" ON "crm_territories"("branch_id");

CREATE UNIQUE INDEX "crm_territory_members_territory_id_user_id_key" ON "crm_territory_members"("territory_id", "user_id");
CREATE INDEX "crm_territory_members_user_id_idx" ON "crm_territory_members"("user_id");

CREATE UNIQUE INDEX "crm_leads_lead_number_key" ON "crm_leads"("lead_number");
CREATE INDEX "crm_leads_owner_id_idx" ON "crm_leads"("owner_id");
CREATE INDEX "crm_leads_status_idx" ON "crm_leads"("status");
CREATE INDEX "crm_leads_territory_id_idx" ON "crm_leads"("territory_id");
CREATE INDEX "crm_leads_branch_id_idx" ON "crm_leads"("branch_id");

CREATE UNIQUE INDEX "crm_opportunities_opportunity_number_key" ON "crm_opportunities"("opportunity_number");
CREATE INDEX "crm_opportunities_owner_id_idx" ON "crm_opportunities"("owner_id");
CREATE INDEX "crm_opportunities_stage_idx" ON "crm_opportunities"("stage");
CREATE INDEX "crm_opportunities_territory_id_idx" ON "crm_opportunities"("territory_id");
CREATE INDEX "crm_opportunities_branch_id_idx" ON "crm_opportunities"("branch_id");
CREATE INDEX "crm_opportunities_customer_id_idx" ON "crm_opportunities"("customer_id");

CREATE INDEX "crm_interactions_lead_id_idx" ON "crm_interactions"("lead_id");
CREATE INDEX "crm_interactions_opportunity_id_idx" ON "crm_interactions"("opportunity_id");
CREATE INDEX "crm_interactions_customer_id_idx" ON "crm_interactions"("customer_id");
CREATE INDEX "crm_interactions_created_by_id_idx" ON "crm_interactions"("created_by_id");

CREATE INDEX "crm_tasks_assigned_to_id_status_idx" ON "crm_tasks"("assigned_to_id", "status");
CREATE INDEX "crm_tasks_due_date_idx" ON "crm_tasks"("due_date");
CREATE INDEX "crm_tasks_lead_id_idx" ON "crm_tasks"("lead_id");
CREATE INDEX "crm_tasks_opportunity_id_idx" ON "crm_tasks"("opportunity_id");

CREATE INDEX "crm_sales_targets_user_id_idx" ON "crm_sales_targets"("user_id");
CREATE INDEX "crm_sales_targets_period_start_period_end_idx" ON "crm_sales_targets"("period_start", "period_end");
