-- Payment vouchers: general money-out with approval (draft -> submit -> approve -> pay)

CREATE TYPE "payment_voucher_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID', 'CANCELLED');

CREATE TABLE "payment_vouchers" (
    "id" TEXT NOT NULL,
    "voucher_number" TEXT NOT NULL,
    "status" "payment_voucher_status" NOT NULL DEFAULT 'DRAFT',
    "payee_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "reference_no" TEXT,
    "payment_date" TIMESTAMP(3) NOT NULL,
    "expense_account_id" TEXT,
    "branch_id" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "paid_by_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_vouchers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_vouchers_voucher_number_key" ON "payment_vouchers"("voucher_number");
CREATE INDEX "payment_vouchers_status_idx" ON "payment_vouchers"("status");
CREATE INDEX "payment_vouchers_requested_by_id_idx" ON "payment_vouchers"("requested_by_id");
CREATE INDEX "payment_vouchers_branch_id_idx" ON "payment_vouchers"("branch_id");
CREATE INDEX "payment_vouchers_payment_date_idx" ON "payment_vouchers"("payment_date");
