-- Step 1 of Cashier Session Management Implementation
-- Remove legacy Sales and SalesItem models
-- All POS operations now use the modern SalesDocument and SalesDocumentItem models

-- First, handle any foreign keys that might reference sales table
BEGIN;

-- Drop the dependent tables/columns using CASCADE
DROP TABLE IF EXISTS "sales_items" CASCADE;
DROP TABLE IF EXISTS "sales" CASCADE;

-- Remove the SalesStatus enum if it exists
DROP TYPE IF EXISTS "SalesStatus";

COMMIT;
