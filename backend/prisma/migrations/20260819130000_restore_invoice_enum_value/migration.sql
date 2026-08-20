-- Corrective migration: restore the INVOICE value to sales_document_type.
-- The previous migration (20260819120000_pos_document_state_machine) renamed
-- INVOICE → OPEN_INVOICE / CLOSED_INVOICE before the application code was
-- updated. All service and controller code still uses the INVOICE variant, so
-- we add it back as a valid enum member. OPEN_INVOICE and CLOSED_INVOICE are
-- retained for future use once the state-machine transition is completed.

ALTER TYPE "sales_document_type" ADD VALUE IF NOT EXISTS 'INVOICE';
