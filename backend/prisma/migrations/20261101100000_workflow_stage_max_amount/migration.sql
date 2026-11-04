-- Upper bound for a stage, so amount-tiered approvals (standard / high value / executive)
-- can be expressed as stages that each apply to one band: min_amount <= amount < max_amount.
ALTER TABLE "workflow_stages" ADD COLUMN "max_amount" DOUBLE PRECISION;
