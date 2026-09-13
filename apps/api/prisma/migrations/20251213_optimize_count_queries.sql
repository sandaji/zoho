-- Additional performance optimization indexes
-- Created: 2025-12-13
-- Focus: Further optimize COUNT queries for admin stats

-- ==================================================
-- CRITICAL: Add simple COUNT-optimized indexes
-- ==================================================

-- Simple index on isActive for fast COUNT(*) on branches
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_branches_isactive" 
ON "branches"("isActive") 
WHERE "isActive" = true;

-- Simple index on isActive for fast COUNT(*) on warehouses
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_warehouses_isactive" 
ON "warehouses"("isActive") 
WHERE "isActive" = true;

-- Simple index on isActive for fast COUNT(*) on users
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_isactive" 
ON "users"("isActive") 
WHERE "isActive" = true;

-- Simple index on isActive for fast COUNT(*) on products
CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_products_isactive" 
ON "products"("isActive") 
WHERE "isActive" = true;

-- ==================================================
-- VACUUM and ANALYZE for optimal query planning
-- ==================================================

-- Update table statistics for query planner
VACUUM ANALYZE "branches";
VACUUM ANALYZE "warehouses";
VACUUM ANALYZE "users";
VACUUM ANALYZE "products";
VACUUM ANALYZE "deliveries";

-- ==================================================
-- PostgreSQL configuration checks (run manually)
-- ==================================================

-- Check current work_mem setting (should be at least 4MB for complex queries)
-- SHOW work_mem;

-- Check shared_buffers (should be ~25% of RAM)
-- SHOW shared_buffers;

-- Check effective_cache_size (should be ~50-75% of RAM)
-- SHOW effective_cache_size;

-- ==================================================
-- Verify indexes are being used
-- ==================================================

-- Run EXPLAIN ANALYZE on your queries to verify index usage:
-- EXPLAIN ANALYZE SELECT COUNT(*) FROM "branches" WHERE "isActive" = true;
-- Look for "Index Scan" or "Index Only Scan" in the output
