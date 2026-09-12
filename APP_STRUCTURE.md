# App Structure (Detailed and Grouped)

This project is organized as a monorepo with a backend API and a Next.js frontend. The structure is separated by responsibilities, with feature-based modules in both the API and UI layers.

## 1) Root Level

- `README.md` — project overview and setup instructions
- `package.json` — root workspace configuration
- `tsconfig.base.json` — shared TypeScript settings for the monorepo
- `test-token-refresh.sh` — script for testing token refresh behavior
- `.gitignore` — git ignore rules
- `backend/` — server-side application
- `frontend/` — client-side Next.js application

---

## 2) Backend Application

### Core backend files

- `backend/package.json`
- `backend/README.md`
- `backend/tsconfig.json`
- `backend/tsconfig.test.json`
- `backend/prisma.config.ts`
- `backend/restructure-backend.sh`
- `backend/update-imports.js`

### Backend folders

#### Prisma and database

- `backend/prisma/`
  - `schema.prisma` — database schema
  - `seed.ts` — seed data script
  - `migrations/` — SQL migration history

#### Scripts and automation

- `backend/scripts/`
  - `add-transfer-rbac.ts`
  - `backfill-inventory-available.ts`
  - `backfill-stock-batches.ts`
  - `init-fiscal-year.ts`
  - `seed-dashboard.ts`
  - `maintenance/`

#### Application source

- `backend/src/`
  - `app.ts` — app setup and middleware wiring
  - `index.ts` — server bootstrap
  - `config/` — environment/configuration
  - `core/` — shared core logic and base utilities
  - `generated/` — generated code (possibly Prisma or OpenAPI output)
  - `middleware/` — Express/HTTP middleware
  - `modules/` — domain modules and feature groups
  - `repositories/` — data access repositories
  - `routes/` — API routes/endpoints
  - `services/` — business logic services
  - `shared/` — shared utilities/constants/types for backend
  - `subscribers/` — event/message subscribers
  - `types/` — backend-specific TypeScript types
  - `utils/` — helper functions

### Backend module grouping

The backend is organized around business features and domain modules. Typical areas include:

- `backend/src/modules/` — feature modules for business logic
- `backend/src/routes/` — HTTP layer for endpoints
- `backend/src/services/` — service layer for each domain
- `backend/src/repositories/` — persistence layer
- `backend/src/types/` — domain request/response types

This structure suggests a layered architecture with separation between:

- API routes
- business services
- data repositories
- shared utilities
- generated and database-related code

---

## 3) Frontend Application

### Frontend core files

- `frontend/package.json`
- `frontend/next.config.ts`
- `frontend/tsconfig.json`
- `frontend/eslint.config.mjs`
- `frontend/postcss.config.mjs`
- `frontend/components.json`
- `frontend/next-env.d.ts`
- `frontend/proxy.ts`
- `frontend/Dockerfile`
- `frontend/Dockerfile.dev`

### Frontend app shell

- `frontend/app/`
  - `layout.tsx` — root layout
  - `page.tsx` — landing page
  - `globals.css` — global styles
  - `auth/` — authentication-related pages
  - `dashboard/` — dashboard pages

### Frontend UI and feature components

- `frontend/components/`
  - `ui/` — shared primitive UI components
  - `admin/` — admin panels and admin management components
  - `cashier/` — cashier workflow UIs
  - `dashboard/` — dashboard widgets and views
  - `finance/` — finance-related components
  - `inventory/` — inventory management UI
  - `pos/` — point-of-sale UI
  - `print/` — print-related components/templates
  - `purchasing/` — purchasing flows
  - `sales/` — sales screens and components
  - `sidebar/` — navigation/sidebar UI
  - `notification-bell.tsx`
  - `theme-provider.tsx`

### Frontend hooks

- `frontend/hooks/`
  - `use-barcode-scanner.ts`
  - `use-debounce.ts`
  - `use-hotkeys.ts`
  - `use-inventory.ts`
  - `use-mobile.ts`
  - `use-permissions.ts`
  - `use-sidebar-preferences.ts`
  - `use-toast.ts`
  - `cashier/`

### Frontend libraries and services

- `frontend/lib/`
  - `admin-api.ts` — admin API access layer
  - `admin-global-api.ts` — global admin API client
  - `api-client.ts` — base API client
  - `api-config.ts` — API configuration
  - `api-utils.ts` — API helpers
  - `auth-context.tsx` — authentication context
  - `branch.service.ts`
  - `dashboard.service.ts`
  - `department.service.ts`
  - `employee.service.ts`
  - `expense-report.service.ts`
  - `navigation.ts`
  - `moduleColors.ts`
  - `purchasing.service.ts`
  - `requisition.service.ts`
  - `rbac-api.ts`
  - `role-routing.ts`
  - `statusColors.ts`
  - `theme.ts`
  - `toast-context.tsx`
  - `warehouse.service.ts`
  - `api/` — additional API modules
  - `table/` — table-related logic
  - `types/` — frontend type definitions
  - `utils.ts`
  - `utils/` — extra utilities

### Frontend state and UI assets

- `frontend/stores/`
  - `usePOSStore.ts` — POS state store
- `frontend/public/` — public assets
- `frontend/styles/` — CSS files including print styles
- `frontend/tests/` — test setup and unit tests
- `frontend/types/` — app-wide frontend types

---

## 4) Feature-focused summary

This app looks like a business management system with modules for:

- Admin
- Cashier
- Dashboard
- Finance
- Inventory
- POS
- Purchasing
- Sales
- HR / employee features
- Branch / warehouse / department management
- RBAC / permissions
- Expense reporting and requisition workflows

---

## 5) Overall architecture

The project combines:

- `backend` for business logic, database access, routes, and API services
- `frontend` for user interfaces, dashboards, workflows, and state management
- `Prisma` for schema and database migration management
- modular domain folders for clear separation of responsibilities

In short, this is a layered business application with feature-driven modules rather than a single monolithic app structure.

---

## 6) Tree View

```text
zoho/
├── README.md
├── package.json
├── tsconfig.base.json
├── test-token-refresh.sh
├── .gitignore
├── backend/
│   ├── README.md
│   ├── package.json
│   ├── prisma.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.test.json
│   ├── restructure-backend.sh
│   ├── update-imports.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── seed.ts
│   │   └── migrations/
│   ├── scripts/
│   │   ├── add-transfer-rbac.ts
│   │   ├── backfill-inventory-available.ts
│   │   ├── backfill-stock-batches.ts
│   │   ├── init-fiscal-year.ts
│   │   ├── seed-dashboard.ts
│   │   └── maintenance/
│   └── src/
│       ├── app.ts
│       ├── index.ts
│       ├── config/
│       ├── core/
│       ├── generated/
│       ├── middleware/
│       ├── modules/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       ├── shared/
│       ├── subscribers/
│       ├── types/
│       └── utils/
├── frontend/
│   ├── package.json
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── eslint.config.mjs
│   ├── postcss.config.mjs
│   ├── components.json
│   ├── next-env.d.ts
│   ├── proxy.ts
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── auth/
│   │   └── dashboard/
│   ├── components/
│   │   ├── ui/
│   │   ├── admin/
│   │   ├── cashier/
│   │   ├── dashboard/
│   │   ├── finance/
│   │   ├── inventory/
│   │   ├── pos/
│   │   ├── print/
│   │   ├── purchasing/
│   │   ├── sales/
│   │   ├── sidebar/
│   │   ├── notification-bell.tsx
│   │   └── theme-provider.tsx
│   ├── hooks/
│   │   ├── use-barcode-scanner.ts
│   │   ├── use-debounce.ts
│   │   ├── use-hotkeys.ts
│   │   ├── use-inventory.ts
│   │   ├── use-mobile.ts
│   │   ├── use-permissions.ts
│   │   ├── use-sidebar-preferences.ts
│   │   ├── use-toast.ts
│   │   └── cashier/
│   ├── lib/
│   │   ├── admin-api.ts
│   │   ├── admin-global-api.ts
│   │   ├── api-client.ts
│   │   ├── api-config.ts
│   │   ├── api-utils.ts
│   │   ├── auth-context.tsx
│   │   ├── branch.service.ts
│   │   ├── dashboard.service.ts
│   │   ├── department.service.ts
│   │   ├── employee.service.ts
│   │   ├── expense-report.service.ts
│   │   ├── navigation.ts
│   │   ├── moduleColors.ts
│   │   ├── purchasing.service.ts
│   │   ├── requisition.service.ts
│   │   ├── rbac-api.ts
│   │   ├── role-routing.ts
│   │   ├── statusColors.ts
│   │   ├── theme.ts
│   │   ├── toast-context.tsx
│   │   ├── warehouse.service.ts
│   │   ├── api/
│   │   ├── table/
│   │   ├── types/
│   │   ├── utils.ts
│   │   └── utils/
│   ├── stores/
│   │   └── usePOSStore.ts
│   ├── public/
│   ├── styles/
│   ├── tests/
│   │   ├── setup.ts
│   │   └── unit/
│   ├── types/
│   │   └── admin.ts
│   └── .next/
└── node_modules/
```
