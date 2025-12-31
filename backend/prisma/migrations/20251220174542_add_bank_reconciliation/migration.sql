-- CreateTable
CREATE TABLE "bank_statements" (
    "id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_lines" (
    "id" TEXT NOT NULL,
    "statement_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_date" TIMESTAMP(3),
    "journal_entry_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_statement_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_statements_account_id_idx" ON "bank_statements"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_statement_lines_journal_entry_id_key" ON "bank_statement_lines"("journal_entry_id");

-- CreateIndex
CREATE INDEX "bank_statement_lines_statement_id_idx" ON "bank_statement_lines"("statement_id");

-- CreateIndex
CREATE INDEX "bank_statement_lines_date_idx" ON "bank_statement_lines"("date");

-- CreateIndex
CREATE INDEX "bank_statement_lines_amount_idx" ON "bank_statement_lines"("amount");

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement_lines" ADD CONSTRAINT "bank_statement_lines_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
