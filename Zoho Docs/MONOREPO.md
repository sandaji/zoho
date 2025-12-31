# Monorepo Setup Guide

## Overview

This is an npm workspaces monorepo with two packages:

- `frontend` - Next.js 16 application
- `backend` - Node.js + Express API

## Workspace Commands

### Run Commands in All Workspaces

```bash
npm run dev --workspaces           # Run dev in all workspaces
npm run build --workspaces         # Build all packages
npm run lint --workspaces          # Lint all packages
npm run type-check --workspaces    # Type check all packages
```

### Run Commands in Specific Workspace

```bash
npm --workspace=frontend run dev
npm --workspace=backend run dev
npm --workspace=backend run db:push
```

### Short Syntax

```bash
npm -w frontend run dev            # Same as --workspace=frontend
npm -w backend run build           # Same as --workspace=backend
npm -w frontend -w backend run lint # Run in multiple workspaces
```

## Installing Dependencies

### Add to Frontend

```bash
npm install react-query --workspace=frontend
```

### Add to Backend

```bash
npm install express-validator --workspace=backend
```

### Add to Root (DevDependencies)

```bash
npm install --save-dev typescript
```

### Add Multiple to Workspace

```bash
npm install lodash axios --workspace=frontend
```

## Project Structure

```
zoho-erp/
├── frontend/                    # Next.js workspace
│   ├── src/
│   ├── package.json            # Frontend dependencies
│   ├── tsconfig.json           # Frontend TypeScript config
│   ├── next.config.ts          # Next.js configuration
│   └── README.md
│
├── backend/                     # Node.js workspace
│   ├── src/
│   ├── prisma/
│   ├── package.json            # Backend dependencies
│   ├── tsconfig.json           # Backend TypeScript config
│   ├── .eslintrc.json
│   └── README.md
│
├── package.json                # Root monorepo config
├── .github/
│   └── workflows/              # CI/CD pipelines
├── docker-compose.yml          # Local database setup
└── README.md
```

## Setting Up Development Environment

### 1. Install Dependencies

```bash
# Install dependencies for all workspaces
npm install
```

### 2. Setup Environment Variables

#### Frontend

```bash
cd frontend
cp .env.example .env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

#### Backend

```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/zoho_erp_dev"
JWT_SECRET="your-secret-key"
```

### 3. Database Setup

Option A: Using Docker Compose (Recommended)

```bash
docker-compose up -d              # Start PostgreSQL
npm run db:push                    # Push Prisma schema
```

Option B: Local PostgreSQL

```bash
createdb zoho_erp_dev
npm run db:push
```

### 4. Start Development Servers

```bash
npm run dev
```

This starts both frontend and backend in parallel:

- Frontend: http://localhost:3000
- Backend: http://localhost:5000

## Continuous Integration

GitHub Actions workflows run on every push/PR:

### `lint-and-build.yml`

- Runs linting across all workspaces
- Type checking
- Builds all packages
- Tests on Node 18.x and 20.x
- Security audit

Run locally:

```bash
npm run lint --workspaces
npm run type-check --workspaces
npm run build --workspaces
```

### `backend-tests.yml`

- Backend-specific tests
- Runs with test PostgreSQL database
- Triggers on backend changes

## Adding New Packages to Monorepo

### Structure

```
zoho-erp/
├── frontend/
├── backend/
└── packages/
    ├── shared/     # Shared types, utils, etc.
    └── ui/         # Shared UI components
```

### Create New Workspace Package

```bash
mkdir packages/shared
cd packages/shared
npm init -y
# Edit package.json, add to root package.json workspaces array
```

Update root `package.json`:

```json
{
  "workspaces": ["frontend", "backend", "packages/shared"]
}
```

Run `npm install` to link everything.

## Shared Dependencies

To use shared code between frontend and backend:

```bash
# packages/shared/package.json
{
  "name": "@zoho-erp/shared",
  "version": "1.0.0",
  "main": "dist/index.js"
}
```

Import in frontend:

```typescript
import { User } from "@zoho-erp/shared";
```

Import in backend:

```typescript
import { User } from "@zoho-erp/shared";
```

## Version Management

Each workspace has its own version in `package.json`. Update independently:

```bash
# Frontend bump
npm version minor --workspace=frontend

# Backend bump
npm version patch --workspace=backend
```

## Troubleshooting

### "Cannot find module"

```bash
npm install
npm run build --workspaces
```

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Kill process on port 5000
npx kill-port 5000
```

### Workspace Not Found

```bash
# Ensure all workspaces are listed in root package.json
npm ls -r --depth=0
```

### Dependencies Not Linking

```bash
npm install
npm run build --workspaces
```

## Performance Tips

1. **Use `npm ci` in CI/CD** instead of `npm install`
2. **Run builds in parallel** with `--workspaces`
3. **Leverage TypeScript** for early error detection
4. **Use ESLint** for code quality

## References

- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Documentation](https://expressjs.com)
