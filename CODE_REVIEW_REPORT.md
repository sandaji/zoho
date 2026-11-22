# SwiftPOS Frontend and Backend Code Review

**Review date:** 22 November 2026  
**Review type:** Static code review  
**Scope:** Frontend architecture, backend/API structure, styling, API consumption, and likely dead or deprecated code.

## Executive summary

SwiftPOS is a broad ERP application built with Next.js, React, TypeScript, Express, and Prisma. The codebase has established feature areas and shared UI components, but it has accumulated multiple API-client patterns and legacy route/code paths.

The most urgent findings are in authentication and authorization: a signed-in user can appear able to promote their own account through the profile endpoint, public registration accepts a caller-selected role, and login contains a hard-coded admin bootstrap credential. These should be reviewed and fixed before production use.

This review was static. The application, build, and tests were not run.

## Critical security findings

### 1. Self-service profile update accepts a role change

**Severity: Critical**

The authenticated `PATCH /v1/auth/profile` route passes the request body to `AuthService.updateUser`. That service writes `data.role` to the current user record. The refresh service later reads the updated role and includes it in a newly issued token. The RBAC middleware grants admin roles access to all protected endpoints.

A signed-in user may therefore be able to change their own role to `admin`, refresh their token, and gain admin access.

**Relevant code:**

- `backend/src/modules/auth/routes.ts:54-58`
- `backend/src/modules/auth/controllers/auth.controller.ts:97-107`
- `backend/src/modules/auth/services/auth.service.ts:259-273`
- `backend/src/modules/auth/services/auth.service.ts:408-435`
- `backend/src/middleware/rbac.middleware.ts:23-25`

**Recommendation:** Remove `role` from the self-service profile contract and update logic. Put role changes behind an admin-only endpoint with a dedicated permission check and audit record.

### 2. Public registration accepts a caller-selected role

**Severity: Critical**

The `POST /v1/auth/register` route has no authentication middleware. Its request DTO allows an optional role, and the service looks up that role and creates a role assignment for it. The database seed includes a `super_admin` role.

A caller may be able to register with a privileged role and then authenticate with those privileges.

**Relevant code:**

- `backend/src/modules/auth/routes.ts:31-32`
- `backend/src/modules/auth/dtos/index.ts:52-58`
- `backend/src/modules/auth/services/auth.service.ts:135-193`
- `backend/prisma/seed.ts:394`

**Recommendation:** Disable public registration if it is not required. Otherwise, ignore the client-supplied role and assign a fixed least-privileged role. Role elevation should require a separate, authorized workflow.

### 3. Hard-coded admin bootstrap credential

**Severity: High**

If the configured admin email is not already present, the login service creates an admin account when given the hard-coded password `password123`. On a fresh database, those known credentials can establish an admin account.

**Relevant code:** `backend/src/modules/auth/services/auth.service.ts:15-53`

**Recommendation:** Remove this runtime bootstrap. Use an explicit, one-time setup process with an operator-provided secret, and require a password change on first use.

## Authentication and session handling

### Expired-token refresh is not wired to succeed

The frontend tries to refresh after an API request returns 401. It sends the same access token to `/v1/auth/refresh`, but the backend protects that route with normal JWT authentication. JWT verification rejects expired tokens, so a token that expired cannot reach the refresh handler.

**Relevant code:**

- `frontend/lib/api-client.ts:51-63`
- `backend/src/modules/auth/routes.ts:65-69`
- `backend/src/core/middleware/auth.ts:31-48`
- `backend/src/core/utils/jwt.ts:36-47`

There is also a setting mismatch: JWT generation reads `JWT_EXPIRY` with a default of `24h`, while the environment schema defines `JWT_EXPIRES_IN` with a default of `7d`. The setting in the schema does not match the one used for token creation.

**Recommendation:** Use a separate refresh credential that remains valid after access-token expiry, and consolidate the token-expiry setting.

### Tokens are exposed to browser JavaScript

The access token is stored in `localStorage` and copied into a JavaScript-set cookie. Both are readable by same-origin scripts, increasing the impact of any cross-site scripting issue.

**Relevant code:** `frontend/lib/auth-context.tsx:102-112`

**Recommendation:** Consider server-set `HttpOnly`, `Secure` cookies and a backend-for-frontend flow. Include a CSRF strategy if authentication moves to cookies.

## Frontend and API consumption

### API calls use several overlapping client patterns

The frontend consumes the backend through:

- Direct `fetch` calls in pages and components.
- Feature service wrappers such as `warehouse.service.ts`.
- `apiClient`, which handles auth headers, refresh attempts, and response normalization.
- A separate `BaseApiClient`, used by the product client, with different request and error behavior.

**Relevant code:**

- `frontend/lib/api-client.ts:20-24`
- `frontend/lib/api/client.ts:24-108`
- `frontend/lib/api/product-client.ts:8-65`
- Example feature wrapper: `frontend/lib/warehouse.service.ts`

Because these paths differ in authentication, error handling, and response parsing, endpoint behavior is not uniform across screens.

**Recommendation:** Standardize on one API client and typed feature services. Normalize success and error envelopes once, and have pages/components consume those services instead of constructing requests themselves.

### API base URL configuration is duplicated

Both `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_API_BASE_URL` are defined. The current API configuration reads `NEXT_PUBLIC_API_URL` and helpers append endpoint paths separately.

**Relevant code:**

- `frontend/lib/env.ts:7-12`
- `frontend/lib/api-config.ts:13,119`

**Recommendation:** Choose one canonical base URL format and use it consistently.

### One rewrite is pinned to localhost

The POS history page requests `/api/sales/documents`, which Next rewrites to `http://localhost:5000`. That can fail when the frontend and backend are deployed separately.

**Relevant code:**

- `frontend/next.config.ts:14-20`
- `frontend/app/dashboard/pos/history/page.tsx:116`

**Recommendation:** Make the rewrite target environment-driven or route this call through the same configured API client.

## Styling review

The frontend uses Tailwind CSS v4, shared CSS variables for semantic colors and themes, and reusable UI components. It has a recognizable palette and shared table treatments.

The global stylesheet also remaps multiple Tailwind color families to the same ERP colors. This makes visual changes broad and can cause an unrelated utility class to change meaning across the app. Dark mode includes a manually maintained list of utility overrides, so screens using classes outside that list may look inconsistent. The root font size is 13px, which makes `text-sm` smaller than 13px.

**Relevant code:** `frontend/app/globals.css:19-117,199-344,345-440`

**Recommendations:**

- Prefer semantic design tokens such as primary, muted, success, warning, and destructive over global remapping of every utility shade.
- Audit dark mode across the major screens after token changes.
- Review text size and contrast, particularly in data-dense tables and forms.
- Keep shared component variants as the default place for recurring button, badge, card, and table styles.

## Backend structure and validation

The backend uses Express and Prisma and exposes the API under `/v1`. There are feature modules for areas such as finance, inventory, purchasing, and HR. The central route registry also retains older controller routes and explicitly labeled legacy fleet routes.

**Relevant code:** `backend/src/app.ts:86`, `backend/src/routes/index.ts:1-925`, and legacy routes at `backend/src/routes/index.ts:645-710`.

This mix increases route duplication and makes it harder to see which implementation is canonical.

The repository has shared validation middleware, but schema validation is used inconsistently at route boundaries. Some handlers pass request bodies to services directly.

**Recommendations:**

- Consolidate route registration around feature modules.
- Retire legacy compatibility routes after confirming their consumers have migrated.
- Apply request schemas consistently to body, query, and path parameters.
- Keep authorization checks in the backend even when the frontend hides or blocks screens.

## Dead and deprecated code candidates

The review found 13 files under `frontend/app/dashboard/finance/_deprecated`. The frontend TypeScript config excludes deprecated paths. It also found 6 tracked files under `_deleted_by_claude`. Searches found no live references to the deleted collection or the deprecated stock-transfer component.

These are cleanup candidates, but confirm there are no dynamic or external references before removing them.

**Relevant code:**

- `frontend/tsconfig.json:35`
- `frontend/app/dashboard/finance/_deprecated/`
- `frontend/components/admin/_deprecated/StockTransfersSection.tsx`
- `_deleted_by_claude/`

TypeScript is configured with `noUnusedLocals` and `noUnusedParameters` disabled in `tsconfig.base.json:24-25`, so unused imports and symbols are less likely to be surfaced automatically.

## Recommended priority order

1. Remove self-service role updates and prevent public registration from assigning privileged roles.
2. Remove the hard-coded admin bootstrap credential.
3. Repair access-token refresh and align the JWT expiry configuration.
4. Standardize frontend API consumption and response/error handling.
5. Apply request validation consistently at backend route boundaries.
6. Review browser token storage, styling/dark-mode consistency, and readability.
7. Remove confirmed deprecated code and gradually retire legacy API routes.
8. Add regression tests for role escalation, registration, token refresh, API response envelopes, and major dark-mode screens.

