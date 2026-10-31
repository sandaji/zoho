-- Workflow engine: definitions, stages, instances, steps, delegation, append-only event trail

CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "entity_type" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_stages" (
    "id" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approver_permission" TEXT NOT NULL,
    "branch_scoped" BOOLEAN NOT NULL DEFAULT false,
    "min_amount" DOUBLE PRECISION,
    "escalate_after_hours" INTEGER,
    "escalate_to_permission" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_stages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_instances" (
    "id" TEXT NOT NULL,
    "instance_number" TEXT NOT NULL,
    "definition_id" TEXT NOT NULL,
    "definition_code" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "amount" DOUBLE PRECISION,
    "branch_id" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "current_order" INTEGER NOT NULL DEFAULT 1,
    "payload" JSONB,
    "outcome_applied" BOOLEAN NOT NULL DEFAULT false,
    "outcome_error" TEXT,
    "completed_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "stage_id" TEXT,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "approver_permission" TEXT NOT NULL,
    "branch_scoped" BOOLEAN NOT NULL DEFAULT false,
    "escalate_after_hours" INTEGER,
    "escalate_to_permission" TEXT,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "due_at" TIMESTAMP(3),
    "escalated_at" TIMESTAMP(3),
    "acted_by_id" TEXT,
    "on_behalf_of_id" TEXT,
    "acted_at" TIMESTAMP(3),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_delegations" (
    "id" TEXT NOT NULL,
    "from_user_id" TEXT NOT NULL,
    "to_user_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_delegations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_events" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "step_id" TEXT,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "on_behalf_of_id" TEXT,
    "comment" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "prev_hash" TEXT,
    "hash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_definitions_code_key" ON "workflow_definitions"("code");
CREATE INDEX "workflow_stages_definition_id_order_idx" ON "workflow_stages"("definition_id", "order");
CREATE UNIQUE INDEX "workflow_instances_instance_number_key" ON "workflow_instances"("instance_number");
CREATE INDEX "workflow_instances_status_idx" ON "workflow_instances"("status");
CREATE INDEX "workflow_instances_requested_by_id_idx" ON "workflow_instances"("requested_by_id");
CREATE INDEX "workflow_instances_entity_type_entity_id_idx" ON "workflow_instances"("entity_type", "entity_id");
CREATE INDEX "workflow_instances_branch_id_idx" ON "workflow_instances"("branch_id");
CREATE INDEX "workflow_steps_instance_id_idx" ON "workflow_steps"("instance_id");
CREATE INDEX "workflow_steps_status_approver_permission_idx" ON "workflow_steps"("status", "approver_permission");
CREATE INDEX "workflow_delegations_from_user_id_idx" ON "workflow_delegations"("from_user_id");
CREATE INDEX "workflow_delegations_to_user_id_idx" ON "workflow_delegations"("to_user_id");
CREATE INDEX "workflow_events_instance_id_createdAt_idx" ON "workflow_events"("instance_id", "createdAt");

-- The approval trail is evidence: rows can be added but never changed or removed.
CREATE OR REPLACE FUNCTION workflow_events_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'workflow_events is append-only (% not allowed)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER workflow_events_no_change
  BEFORE UPDATE OR DELETE ON "workflow_events"
  FOR EACH ROW EXECUTE FUNCTION workflow_events_append_only();
