# Backend Folder Structure

```text
backend/
├── .env
├── .eslintrc.json
├── .gitignore
├── package.json
├── prisma.config.ts
├── README.md
├── seed-dashboard.ts
├── tsconfig.json
├── tsconfig.test.json
│
├── _archive/
│   └── modules/
│       ├── finance/
│       └── purchasing/
│           └── services/
├── _delete_me/
│   ├── schema.backup.prisma
│   ├── schema_changes.txt
│   ├── schema_diff_check.txt
│   ├── seed_output.txt
│   └── test-finance-refactor.js
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   ├── assign-procurement-role.ts
│   ├── check-user-permissions.ts
│   ├── fix_column_alignment.sql
│   ├── fix-procurement-permissions.ts
│   ├── update-rbac.ts
│   ├── verify-rbac.ts
│   └── migrations/
│       ├── 20240101000000_init/
│       ├── 20250125_remove_legacy_sales_model/
│       ├── 20250207_add_finance_dashboard_features/
│       ├── 20251128194511_add_product_fields/
│       ├── 20251201173314_add_isactive_indexes/
│       ├── 20251205173840_add_branch_roles_and_transfers/
│       ├── 20251210184820_add_warehouse_management/
│       ├── 20251211_optimize_stats_queries/
│       ├── 20251211182029_add_warehouse_management/
│       ├── 20251213_optimize_count_queries.sql
│       ├── 20251214_optimize_pos_search.sql
│       ├── 20251214140039_add_sales_document_system/
│       ├── 20251214140040_add_cashier_session_management/
│       ├── 20251214140041_add_finance_enhancement/
│       ├── 20251220174542_add_bank_reconciliation/
│       ├── 20251220182220_add_stock_movement_fixed/
│       ├── 20251220184335_add_leave_management/
│       ├── 20251226094956_init/
│       ├── 20251227000000_add_fiscal_period_locking/
│       ├── 20251227000001_add_audit_log/
│       ├── 20260302000000_implement_branch_inventory/
│       ├── 20260531_add_user_last_sequence/
│       ├── 20260622_add_missing_user_runtime_columns/
│       ├── 20260725110319_add_erp_tables/
│       ├── 20260728102530_fleet_management_extension/
│       ├── 20260728183416_stock_tranfer_schema/
│       ├── 20260803071116_add_transfer_dispatch_approval_fields/
│       ├── 20260815202009_phase4_transfer_issues_notifications/
│       ├── 20260816183208_add_picked_qty_to_transfer_items/
│       ├── 20260819120000_pos_document_state_machine/
│       ├── 20260819130000_restore_invoice_enum_value/
│       └── 20260827190000_add_customer_employee_codes/
│
├── scripts/
│   ├── add-transfer-rbac.ts
│   ├── backfill-inventory-available.ts
│   ├── backfill-stock-batches.ts
│   └── init-fiscal-year.ts
│
└── src/
    ├── app.ts
    ├── index.ts
    ├── config/
    │   ├── company.config.ts
    │   └── env.ts
    ├── generated/
    │   ├── client.ts
    │   ├── enums.ts
    │   ├── index.ts
    │   ├── models.ts
    │   └── schema.prisma
    ├── lib/
    │   ├── async-context.ts
    │   ├── audit.ts
    │   ├── auth.ts
    │   ├── code-generator.service.ts
    │   ├── db.ts
    │   ├── document.service.ts
    │   ├── domain-events.ts
    │   ├── errors.ts
    │   ├── events.ts
    │   ├── inventory-sync.ts
    │   ├── jwt.ts
    │   ├── logger.ts
    │   ├── password.ts
    │   ├── pdf-generator.ts
    │   ├── prisma.ts
    │   ├── rbac.service.ts
    │   ├── rbac-config.ts
    │   ├── request-helpers.ts
    │   ├── response.ts
    │   ├── response-formatter.ts
    │   ├── sales-calculator.ts
    │   ├── scoped-query.helper.ts
    │   ├── sequencer.ts
    │   └── services/
    │       └── valuation.service.ts
    ├── middleware/
    ├── modules/
    │   ├── admin/
    │   ├── auth/
    │   │   ├── controller/
    │   │   ├── dto/
    │   │   └── service/
    │   ├── branches/
    │   ├── cashier/
    │   │   ├── controller/
    │   │   ├── dto/
    │   │   ├── routes/
    │   │   ├── services/
    │   │   └── validations/
    │   ├── customers/
    │   ├── employees/
    │   ├── finance/
    │   │   ├── controller/
    │   │   ├── controller/payroll/
    │   │   ├── dto/
    │   │   ├── service/
    │   │   ├── service/payroll/
    │   │   └── services/
    │   ├── fleet/
    │   │   ├── controller/
    │   │   ├── dto/
    │   │   └── service/
    │   ├── hr/
    │   │   ├── controller/
    │   │   ├── dto/
    │   │   ├── routes/
    │   │   ├── service/
    │   │   └── services/
    │   ├── inventory/
    │   │   ├── controller/
    │   │   ├── dto/
    │   │   ├── service/
    │   │   └── services/
    │   ├── logistics/
    │   ├── notifications/
    │   ├── pos/
    │   │   ├── controller/
    │   │   ├── dto/
    │   │   └── service/
    │   ├── products/
    │   │   ├── routes/
    │   │   └── services/
    │   ├── purchasing/
    │   │   └── services/
    │   ├── rbac/
    │   ├── reports/
    │   ├── sales/
    │   │   └── routes/
    │   ├── sequences/
    │   └── warehouse/
    │       ├── controller/
    │       ├── controllers/
    │       ├── dto/
    │       ├── routes/
    │       ├── service/
    │       └── services/
    ├── repositories/
    ├── routes/
    ├── services/
    ├── subscribers/
    ├── types/
    └── utils/
```

## Notes

- `src/generated/` contains the generated Prisma client, models, runtime files, and generated type declarations.
- `node_modules/` is installed locally but omitted from this project map.
- Each Prisma migration directory contains its migration SQL file.
- Some source directories above contain additional files not expanded individually to keep this overview readable.
