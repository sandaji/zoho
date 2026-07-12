[ Unified Dashboard / Analytics Layer ]
                         │
┌────────────────────────┼────────────────────────┐
│                        │                        │
▼                        ▼                        ▼
Finance & Core        Logistics & Supply       Growth & People
• Gen Ledger          • Inventory (WMS)        • CRM & Sales
• AP / AR             • Procurement (SRM)      • HR & Payroll
• Cost Tracking       • Manufacturing (MRP)    • Project Mgmt

Cross-module analytics
No unified analytics layer that joins data across Finance + Logistics + People. Each module reports in isolation. No consolidated P&L drill-down linking sales → COGS → payroll.

Finance & Core - schema only
General Ledger
JournalHeader+JournalLine schema exists. No GL entry UI or posting service wired to frontend.

Finance & Core - view only
General Ledger
JournalHeader+JournalLine schema exists. No GL entry UI or posting service wired to frontend.

Accounts Receivable - disconnected
AR model, ARPayment, ARStatus, AR aging summary widget exist. Not linked by FK to SalesDocument.

Accounts Receivable - partial
AR model, ARPayment, ARStatus, AR aging summary widget exist. Not linked by FK to SalesDocument.

Budget management - not built
Budget model + BudgetStatus exists in schema. No frontend budget page or API routes found.

Warehouse multi-location - basic only
Warehouse model has capacity + location but no bin/aisle/zone sub-location system. BranchInventory.bin_location field exists but unused in queries.

Manufacturing / MRP - not built
No Bill of Materials model, no production orders, no work orders, no MRP logic anywhere in schema or backend modules.

Manufacturing / MRP - customer list only
No Bill of Materials model, no production orders, no work orders, no MRP logic anywhere in schema or backend modules.

Payroll - mock data
Payroll model + status enum exist. /dashboard/payroll page built with overview, payslips, analytics tabs. Uses mock data — not wired to real payroll API.

Project Management - not build
No Task, Project, Milestone, or Sprint model anywhere in schema. No /dashboard/projects route or backend module.