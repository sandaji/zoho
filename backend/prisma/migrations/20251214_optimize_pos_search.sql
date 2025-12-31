-- Performance optimization for POS product search
-- Created: 2025-12-14
-- Fixes slow ILIKE queries and improves search performance

-- ==================================================
-- TEXT SEARCH INDEXES for product search
-- ==================================================

-- Create GIN indexes for fast text search on products
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_products_sku_gin" 
ON "products" USING gin (sku gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_products_barcode_gin" 
ON "products" USING gin (barcode gin_trgm_ops) 
WHERE barcode IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_products_name_gin" 
ON "products" USING gin (name gin_trgm_ops);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_products_description_gin" 
ON "products" USING gin (description gin_trgm_ops) 
WHERE description IS NOT NULL;

-- ==================================================
-- COMPOSITE INDEX for inventory lookups
-- ==================================================

-- Optimize inventory lookups by branch
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_inventory_branch_product" 
ON "inventory"("productId", "warehouseId", "available") 
WHERE available > 0;

-- ==================================================
-- ENABLE pg_trgm extension if not already enabled
-- ==================================================

-- This extension is required for the GIN indexes above
-- Run this manually if needed:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ==================================================
-- VACUUM and ANALYZE
-- ==================================================

VACUUM ANALYZE "products";
VACUUM ANALYZE "inventory";
VACUUM ANALYZE "warehouses";

-- ==================================================
-- Query Performance Test
-- ==================================================

-- Test the new indexes with EXPLAIN ANALYZE:
-- EXPLAIN ANALYZE SELECT * FROM products WHERE sku ILIKE '%test%' AND isActive = true LIMIT 10;
-- Should show "Bitmap Index Scan" using the GIN index
