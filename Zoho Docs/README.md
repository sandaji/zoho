# Zoho ERP - Monorepo

A comprehensive Enterprise Resource Planning (ERP) system built with modern technologies.

## Project Structure

```
zoho-erp/
├── frontend/          # Next.js 16 frontend
│   ├── app/          # App router
│   ├── public/       # Static assets
│   ├── .env.example  # Environment template
│   └── tsconfig.json # Strict TypeScript config
│
├── backend/          # Node.js + TypeScript API
│   ├── src/          # Source code
│   ├── prisma/       # Database schema
│   ├── .env.example  # Environment template
│   └── tsconfig.json # Strict TypeScript config
│
└── .github/workflows/ # CI/CD pipelines
    ├── lint-and-build.yml
    └── backend-tests.yml
```

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL
- **Auth**: JWT
- **DevOps**: GitHub Actions, Docker (optional)

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm/yarn/pnpm

### Setup

1. **Clone and install**

   ```bash
   npm install
   ```

2. **Setup environment variables**

   - **Frontend**: `cp frontend/.env.example frontend/.env.local`
   - **Backend**: `cp backend/.env.example backend/.env`

3. **Initialize database**

   ```bash
   npm run db:push
   ```

4. **Start development servers**

   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:3000
   - Backend: http://localhost:5000

## Development Commands

### All Workspaces

```bash
npm run dev          # Start all development servers
npm run build        # Build all packages
npm run lint         # Lint all packages
npm run lint:fix     # Fix linting issues
npm run type-check   # TypeScript type checking
```

### Backend Only

```bash
npm run db:push      # Push schema to database
npm run db:migrate   # Create and run migrations
npm run db:studio    # Open Prisma Studio
```

### Individual Workspace

```bash
npm run dev --workspace=frontend
npm run dev --workspace=backend
```

## Environment Variables

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NODE_ENV=development
```

### Backend (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/zoho_erp_dev"
PORT=5000
NODE_ENV=development
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
CORS_ORIGIN="http://localhost:3000"
```

## API Integration

Frontend makes requests to `/api/*` which are proxied to the backend via Next.js rewrites:

```typescript
// frontend/app/page.tsx
const response = await fetch("/api/health");
const data = await response.json();
```

This request is automatically forwarded to `http://localhost:5000/api/health`

## Features

- ✅ Monorepo with npm workspaces
- ✅ Strict TypeScript configuration (both frontend & backend)
- ✅ ESLint and Prettier integration
- ✅ API proxy via Next.js rewrites
- ✅ Prisma ORM with PostgreSQL
- ✅ Express backend with CORS support
- ✅ JWT authentication ready
- ✅ GitHub Actions CI/CD pipeline

## Deployment

### Frontend (Vercel)

```bash
vercel deploy --scope=zoho
```

### Backend (Render, Railway, Heroku, etc.)

```bash
npm run build
npm start
```

## Contributing

1. Create a feature branch
2. Run linting & type checks: `npm run lint && npm run type-check`
3. Commit changes
4. Push and create a Pull Request

## License

