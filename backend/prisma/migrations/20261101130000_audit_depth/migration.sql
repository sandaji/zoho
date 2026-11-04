-- Audit findings, their history, and the risk register.
CREATE TABLE "audit_findings" (
  "id" TEXT NOT NULL,
  "finding_number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
  "category" TEXT NOT NULL DEFAULT 'CONTROL',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "entity_type" TEXT,
  "entity_id" TEXT,
  "audit_log_id" TEXT,
  "branch_id" TEXT,
  "risk_id" TEXT,
  "raised_by_id" TEXT NOT NULL,
  "owner_id" TEXT,
  "due_date" TIMESTAMP(3),
  "management_response" TEXT,
  "resolution" TEXT,
  "resolved_at" TIMESTAMP(3),
  "closed_by_id" TEXT,
  "closed_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "audit_findings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "audit_findings_finding_number_key" ON "audit_findings"("finding_number");
CREATE INDEX "audit_findings_status_idx" ON "audit_findings"("status");
CREATE INDEX "audit_findings_severity_idx" ON "audit_findings"("severity");
CREATE INDEX "audit_findings_owner_id_idx" ON "audit_findings"("owner_id");
CREATE INDEX "audit_findings_entity_type_entity_id_idx" ON "audit_findings"("entity_type", "entity_id");
CREATE INDEX "audit_findings_risk_id_idx" ON "audit_findings"("risk_id");

CREATE TABLE "audit_finding_events" (
  "id" TEXT NOT NULL,
  "finding_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actor_id" TEXT NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_finding_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_finding_events_finding_id_createdAt_idx" ON "audit_finding_events"("finding_id", "createdAt");

CREATE TABLE "risk_register" (
  "id" TEXT NOT NULL,
  "risk_number" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'OPERATIONAL',
  "likelihood" INTEGER NOT NULL DEFAULT 3,
  "impact" INTEGER NOT NULL DEFAULT 3,
  "score" INTEGER NOT NULL DEFAULT 9,
  "rating" TEXT NOT NULL DEFAULT 'MEDIUM',
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "owner_id" TEXT,
  "mitigation" TEXT,
  "review_date" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "risk_register_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "risk_register_risk_number_key" ON "risk_register"("risk_number");
CREATE INDEX "risk_register_status_idx" ON "risk_register"("status");
CREATE INDEX "risk_register_rating_idx" ON "risk_register"("rating");
CREATE INDEX "risk_register_owner_id_idx" ON "risk_register"("owner_id");

-- Immutability. The audit trail and finding history can be added to but never
-- changed, deleted or truncated through the application or an ordinary DB login.
-- (A database superuser could still drop these triggers; that is itself a loud act.)
CREATE OR REPLACE FUNCTION audit_trail_block_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'integrity_constraint_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION audit_trail_block_change();
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_trail_block_change();

CREATE TRIGGER audit_finding_events_append_only
  BEFORE UPDATE OR DELETE ON "audit_finding_events"
  FOR EACH ROW EXECUTE FUNCTION audit_trail_block_change();
CREATE TRIGGER audit_finding_events_no_truncate
  BEFORE TRUNCATE ON "audit_finding_events"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_trail_block_change();
