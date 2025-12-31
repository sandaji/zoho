-- Performance optimization indexes for admin stats queries
-- Created: 2025-12-11

-- Composite index for low stock items query
CREATE INDEX IF NOT EXISTS "products_active_low_stock_idx" ON "products"("isActive", "quantity", "reorder_level") 
WHERE "isActive" = true;

-- Index for delivery status queries
CREATE INDEX IF NOT EXISTS "deliveries_status_idx" ON "deliveries"("status");

-- Composite index for delivery status with common filters
CREATE INDEX IF NOT EXISTS "deliveries_status_created_idx" ON "deliveries"("status", "createdAt" DESC);

-- Additional indexes for common queries
CREATE INDEX IF NOT EXISTS "products_category_active_idx" ON "products"("category", "isActive");

CREATE INDEX IF NOT EXISTS "finance_transactions_type_date_idx" ON "finance_transactions"("type", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "payroll_status_user_idx" ON "payroll"("status", "userId");

-- Analyze tables to update statistics
ANALYZE products;
ANALYZE deliveries;
ANALYZE branches;
ANALYZE warehouses;
ANALYZE users;
ANALYZE finance_transactions;
ANALYZE payroll;
