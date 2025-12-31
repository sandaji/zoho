-- CreateEnum
CREATE TYPE "sales_document_type" AS ENUM ('DRAFT', 'QUOTE', 'INVOICE', 'CREDIT_NOTE');

-- CreateEnum
CREATE TYPE "sales_document_status" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'VOID', 'CONVERTED', 'CREDITED', 'PARTIALLY_CREDITED');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_documents" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" "sales_document_type" NOT NULL,
    "status" "sales_document_status" NOT NULL,
    "source_document_id" TEXT,
    "branchId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdById" TEXT NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "payment_status" "payment_status",
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_document_items" (
    "id" TEXT NOT NULL,
    "salesDocumentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "tax_rate" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "tax_amount" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_document_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "salesDocumentId" TEXT NOT NULL,
    "customerId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "payment_method" NOT NULL,
    "reference" TEXT,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "type" "sales_document_type" NOT NULL,
    "prefix" TEXT NOT NULL,
    "next_number" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "sales_documents_source_document_id_key" ON "sales_documents"("source_document_id");

-- CreateIndex
CREATE INDEX "sales_documents_type_idx" ON "sales_documents"("type");

-- CreateIndex
CREATE INDEX "sales_documents_status_idx" ON "sales_documents"("status");

-- CreateIndex
CREATE INDEX "sales_documents_branchId_idx" ON "sales_documents"("branchId");

-- CreateIndex
CREATE INDEX "sales_documents_customerId_idx" ON "sales_documents"("customerId");

-- CreateIndex
CREATE INDEX "sales_documents_createdById_idx" ON "sales_documents"("createdById");

-- CreateIndex
CREATE INDEX "sales_documents_issue_date_idx" ON "sales_documents"("issue_date");

-- CreateIndex
CREATE UNIQUE INDEX "sales_documents_branchId_documentId_key" ON "sales_documents"("branchId", "documentId");

-- CreateIndex
CREATE INDEX "sales_document_items_salesDocumentId_idx" ON "sales_document_items"("salesDocumentId");

-- CreateIndex
CREATE INDEX "sales_document_items_productId_idx" ON "sales_document_items"("productId");

-- CreateIndex
CREATE INDEX "payments_salesDocumentId_idx" ON "payments"("salesDocumentId");

-- CreateIndex
CREATE INDEX "payments_customerId_idx" ON "payments"("customerId");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "document_sequences_branchId_idx" ON "document_sequences"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_branchId_type_key" ON "document_sequences"("branchId", "type");

-- AddForeignKey
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "sales_documents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_document_items" ADD CONSTRAINT "sales_document_items_salesDocumentId_fkey" FOREIGN KEY ("salesDocumentId") REFERENCES "sales_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_document_items" ADD CONSTRAINT "sales_document_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_salesDocumentId_fkey" FOREIGN KEY ("salesDocumentId") REFERENCES "sales_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
