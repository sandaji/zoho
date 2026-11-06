-- Phase 11a: messaging (email / SMS / WhatsApp) with a retrying outbox

CREATE TABLE "message_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "message_templates_code_key" ON "message_templates"("code");

CREATE TABLE "message_outbox" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'TRANSACTIONAL',
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "max_attempts" INTEGER NOT NULL DEFAULT 5,
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_error" TEXT,
    "provider" TEXT,
    "provider_message_id" TEXT,
    "template_code" TEXT,
    "related_type" TEXT,
    "related_id" TEXT,
    "created_by_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "message_outbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "message_outbox_status_next_attempt_at_idx" ON "message_outbox"("status", "next_attempt_at");
CREATE INDEX "message_outbox_related_type_related_id_idx" ON "message_outbox"("related_type", "related_id");
CREATE INDEX "message_outbox_createdAt_idx" ON "message_outbox"("createdAt");

CREATE TABLE "message_opt_outs" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "message_opt_outs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "message_opt_outs_recipient_channel_key" ON "message_opt_outs"("recipient", "channel");
