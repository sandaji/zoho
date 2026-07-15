# ROLE

You are a Senior Staff Software Engineer, Senior UX Engineer, and Software Architect working on an enterprise-grade ERP system.

Your responsibility is to improve the existing sidebar without breaking the existing architecture, introducing duplicated logic, creating technical debt, or changing existing business rules.

This is a production codebase.

You MUST behave like a senior engineer reviewing an existing system before writing code.

---

# FIRST PHASE (MANDATORY)

DO NOT WRITE ANY CODE YET.

Before modifying anything, thoroughly inspect the project.

Understand:

* overall folder architecture
* routing
* component hierarchy
* auth flow
* RBAC implementation
* permission system
* branch switching
* navigation flow
* state management
* utility functions
* reusable UI components
* hooks
* shared types
* API architecture
* Tailwind conventions
* design system
* theme conventions
* naming conventions
* file organization
* code style

Read all relevant files first.

Build a complete understanding of how the sidebar currently works.

Understand:

* how Sidebar is rendered
* how buildNavItems works
* how permissions are evaluated
* how roles are evaluated
* how admin navigation works
* how nested navigation works
* how branch switching works
* how active links are determined
* how badges are generated
* how statistics are fetched
* how authentication context works
* how routing works

Do NOT assume anything.

Never hallucinate.

Never invent missing architecture.

If functionality already exists anywhere in the project, reuse it.

---

# SECOND PHASE

After understanding the project, identify:

* duplicated code
* repeated logic
* reusable components
* existing utilities
* existing hooks
* existing UI patterns

Reuse everything possible.

Never duplicate code.

Never create a second implementation of existing functionality.

If functionality already exists:

USE IT.

Do not rewrite it.

---

# THIRD PHASE

Design the implementation before writing code.

The implementation must follow the existing architecture.

Do NOT force a new architecture.

Do NOT introduce breaking changes.

Do NOT introduce unnecessary abstractions.

Only introduce new files when they are genuinely reusable.

---

# IMPLEMENT ALL OF THE FOLLOWING

Every item below is mandatory.

Do not skip any.

Do not partially implement any.

---

1. Convert the sidebar from page-oriented navigation into module-oriented navigation.

Examples:

Sales

Inventory

Procurement

Finance

Human Resources

Fleet & Logistics

Reports

System

Each module should contain its relevant child pages.

Do not flatten modules.

Maintain permission filtering.

---

2. Add consistent module color accents.

Each module should have its own visual identity.

Example:

Sales → Emerald

Inventory → Blue

Finance → Yellow

HR → Purple

Fleet → Orange

Reports → Cyan

Do not create visual inconsistency.

Respect the existing design system.

---

3. Add Favorites.

Users should be able to pin frequently used pages.

Requirements:

* persistent
* no duplicated state
* reusable logic
* clean UI
* permission aware
* survives refresh
* hidden if user lacks permission

---

4. Add Recently Visited.

Track recently opened pages.

Requirements:

* automatic
* limited history
* deduplicate entries
* permission aware
* survives refresh
* reusable implementation

---

5. Implement a Global Search / Command Search.

Users should be able to search:

modules

pages

customers (if architecture supports)

products

settings

commands

Navigation should be instant.

Search should respect permissions.

If command palette already exists, integrate instead of recreating.

---

6. Improve active navigation styling.

Current active styling should be enhanced with:

left accent

improved icon state

improved typography

better contrast

subtle premium effects

Do not overdesign.

Maintain current design language.

---

7. Improve collapsed sidebar.

Collapsed mode should support intelligent fly-out menus.

Hovering a module should display its children.

No duplicated rendering logic.

Use existing navigation configuration.

---

8. Add a Notification Center.

Expand current badge functionality.

Display grouped notifications like:

Low Stock

Pending Deliveries

Pending Approvals

Unpaid Invoices

Pending Purchase Orders

Unread Alerts

Use existing statistics if available.

Extend architecture cleanly.

---

9. Introduce Workspaces.

Support future workspaces such as:

Retail

Manufacturing

Wholesale

Hospital

School

NGO

Architecture should be scalable.

Do not hardcode assumptions.

---

10. Add Pinned Modules.

Allow modules themselves to be pinned.

Pinned modules should appear before normal modules.

Persistent.

Permission aware.

---

11. Improve Admin Dashboard organization.

Reorganize admin navigation into logical enterprise groups.

Example:

System

Security

Infrastructure

Business

Finance

Users

Roles

Warehouses

Products

Branches

Do not remove existing functionality.

---

12. Expand keyboard navigation.

Support shortcuts such as:

Ctrl+K

Ctrl+1

Ctrl+2

Ctrl+3

Arrow navigation

Escape

Enter

Tab accessibility

Do not conflict with existing shortcuts.

---

13. Upgrade badges.

Replace plain counts with meaningful grouped indicators.

Example:

Inventory

3 Low Stock

2 Pending

Finance

5 Reconciliations

Reports

4 Scheduled

---

14. Improve User Information panel.

Include:

Current branch

Role

Session

Relevant contextual information

Current workspace (if implemented)

Do not clutter.

---

15. Improve sidebar footer.

Include useful enterprise information.

Examples:

Application version

Connection status

Environment

Current branch

Logout

Do not hardcode values that should come from configuration.

---

16. Move navigation definitions into a reusable configuration architecture.

The sidebar should become configuration-driven.

Requirements:

Single source of truth.

No duplicated route definitions.

Permissions defined once.

Icons defined once.

Children defined once.

Used by all navigation rendering.

---

17. Dynamic module summaries.

Modules should display useful live information.

Examples:

Sales

Draft Quotes

Pending Orders

Inventory

Low Stock

Transfers

Finance

Pending Reconciliation

Payroll

Pending Payslips

Only use existing backend APIs.

Do not fabricate data.

---

18. Improve dark mode consistency.

Respect existing Tailwind design.

Improve contrast.

Improve hierarchy.

Do not introduce random colors.

Maintain accessibility.

---

19. Separate Operational modules from System modules.

The sidebar should clearly distinguish:

Business Operations

System Administration

Configuration

Reports

Settings

This should improve navigation clarity.

---

20. Implement a full Command Palette.

Users should be able to quickly execute actions like:

Create Invoice

Create Product

Switch Branch

Search Product

Search Customer

Create Purchase Order

Navigate Anywhere

Command palette should be:

fast

permission aware

keyboard driven

extensible

reusable

---

# ENGINEERING REQUIREMENTS

Every implementation must:

* follow existing architecture
* follow project conventions
* follow current naming style
* follow existing folder structure
* follow existing hooks
* follow existing utilities
* follow existing context providers
* follow current RBAC implementation
* follow current permission system

Never duplicate logic.

Never duplicate components.

Never duplicate hooks.

Never duplicate types.

Never duplicate utilities.

Never create dead code.

Never leave unused imports.

Never leave commented code.

Never leave obsolete code.

Remove obsolete code after refactoring.

---

# PERFORMANCE

Avoid unnecessary re-renders.

Memoize where appropriate.

Reuse state.

Avoid prop drilling if existing architecture already solves it.

Avoid unnecessary effects.

Avoid duplicated API requests.

Optimize rendering.

Maintain responsiveness.

---

# ACCESSIBILITY

Ensure:

keyboard navigation

ARIA labels

focus management

screen reader support

proper tab order

accessible hover/focus states

---

# RESPONSIVENESS

Desktop

Laptop

Tablet

Mobile

Collapsed Sidebar

Expanded Sidebar

Admin Sidebar

All must work correctly.

---

# TESTING (MANDATORY)

After implementation, thoroughly test:

Navigation

Permission filtering

Admin navigation

Branch switching

Active states

Badges

Favorites

Recent pages

Notifications

Search

Command palette

Collapsed mode

Expanded mode

Mobile sidebar

Desktop sidebar

Keyboard shortcuts

Accessibility

Dark mode

Light mode

Responsive layouts

Routing

Deep links

Refresh persistence

State persistence

Performance

Ensure there are no regressions.

---

# FINAL VALIDATION

Before finishing, perform a final review.

Confirm:

✓ No duplicated code

✓ No duplicated components

✓ No duplicated hooks

✓ No duplicated utilities

✓ No dead code

✓ No unused imports

✓ No broken routes

✓ No broken permissions

✓ No UI regressions

✓ No TypeScript errors

✓ No ESLint errors

✓ No hydration issues

✓ No accessibility regressions

✓ No responsiveness regressions

✓ No business logic regressions

✓ No hallucinated APIs

✓ No fake data

✓ No unnecessary files

✓ Existing architecture preserved

✓ All 20 requested improvements fully implemented

If any item above fails, continue refining until every requirement passes.
