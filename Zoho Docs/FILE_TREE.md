# Complete File Tree & Configuration Reference

## Folder Structure

```
zoho-erp/
│
├── 📁 frontend/                          # Next.js 16 Frontend Application
│   ├── 📁 app/
│   │   ├── 📄 layout.tsx                # Root layout component
│   │   ├── 📄 page.tsx                  # Home page
│   │   └── 📄 globals.css               # Global styles
│   ├── 📁 public/                       # Static assets (images, fonts, etc.)
│   ├── 📄 next.config.ts                # Next.js configuration with API proxy
│   ├── 📄 tsconfig.json                 # Strict TypeScript configuration
│   ├── 📄 .eslintrc.json                # ESLint rules for React/TypeScript
│   ├── 📄 .prettierrc.json              # Prettier formatting rules
│   ├── 📄 package.json                  # Frontend dependencies
│   ├── 📄 .env.example                  # Environment template
│   ├── 📄 .gitignore                    # Git ignore rules
│   ├── 📄 README.md                     # Frontend documentation
│   ├── 📄 DEVELOPMENT.md                # Frontend dev guide
│   └── 📄 next-env.d.ts                 # Next.js TypeScript declarations
│
├── 📁 backend/                          # Node.js + Express Backend API
│   ├── 📁 src/
│   │   └── 📄 index.ts                  # Main server entry point
│   ├── 📁 prisma/
│   │   ├── 📄 schema.prisma             # Database schema definition
│   │   └── 📁 migrations/               # Database migrations
│   ├── 📁 dist/                         # Compiled JavaScript (generated)
│   ├── 📄 tsconfig.json                 # Strict TypeScript configuration
│   ├── 📄 .eslintrc.json                # ESLint rules for Node.js/TypeScript
│   ├── 📄 package.json                  # Backend dependencies
│   ├── 📄 .env.example                  # Environment template
│   ├── 📄 .gitignore                    # Git ignore rules
│   ├── 📄 README.md                     # Backend documentation
│   └── 📄 DEVELOPMENT.md                # Backend dev guide
│
├── 📁 .github/
│   └── 📁 workflows/
│       ├── 📄 lint-and-build.yml        # Main CI/CD pipeline
│       └── 📄 backend-tests.yml         # Backend test pipeline
│
├── 📁 node_modules/                     # All dependencies (generated)
│
├── 📄 package.json                      # Root monorepo configuration
├── 📄 docker-compose.yml                # Docker services for local dev
├── 📄 .env.example                      # Root environment reference
├── 📄 .gitignore                        # Global git ignore rules
├── 📄 README.md                         # Main documentation
├── 📄 MONOREPO.md                       # Monorepo usage guide
└── 📄 FILE_TREE.md                      # This file
```

## Key Configuration Files

### 1. **Frontend: `next.config.ts`**

```typescript
API Proxy: /api/* → http://localhost:5000/api/*
TypeScript strict mode enabled
Security headers configured
Environment variables forwarding
```

### 2. **Frontend: `tsconfig.json`**

```json
Strict mode: true
No implicit any
No unused variables
No unchecked indexed access
All strict checks enabled
```

### 3. **Backend: `tsconfig.json`**

```json
Target: ES2020
Module: commonjs
Strict mode enabled
Declaration files generation
Source maps enabled
All strict checks enabled
```

### 4. **Backend: `prisma/schema.prisma`**

```
Models:
  - User (email, name, password, role)
  - Product (name, sku, price, quantity)
  - Order (orderNumber, userId, totalAmount, status)
```

### 5. **Root: `package.json`**

```json
Workspaces: frontend, backend
Scripts run across all workspaces
Shared configuration
```

## Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NODE_ENV=development
NEXT_PUBLIC_DEBUG=true
```

### Backend (`.env`)

```env
DATABASE_URL=postgresql://user:password@localhost:5432/zoho_erp_dev
PORT=5000
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=http://localhost:3000
```

## GitHub Actions Workflows

### 1. **lint-and-build.yml** (Main CI/CD)

Triggers: Push to main/develop, Pull requests

**Jobs:**

- Lint (Node 18.x, 20.x)
  - ESLint check
  - Type checking
- Build (Node 18.x, 20.x)
  - Build all packages
  - Upload artifacts
- Security (npm audit)
  - Vulnerability scanning

### 2. **backend-tests.yml** (Backend Tests)

Triggers: Backend changes on main/develop

**Jobs:**

- Test with PostgreSQL service
- Database migration testing
- Build verification

## Dependencies Structure

### Frontend Dependencies

```
Production:
  - react: 19.2.0
  - react-dom: 19.2.0
  - next: 16.0.2

DevDependencies:
  - typescript, @types/*, eslint, @typescript-eslint/*, prettier
  - tailwindcss, @tailwindcss/postcss
```

### Backend Dependencies

```
Production:
  - express: ^4.18.2
  - @prisma/client: ^5.7.0
  - cors: ^2.8.5
  - jsonwebtoken: ^9.1.2
  - dotenv: ^16.3.1

DevDependencies:
  - typescript, @types/*, eslint, @typescript-eslint/*
  - prisma, tsx
```

## Script Reference

### Root Level (All Workspaces)

```bash
npm run dev              # Start all servers
npm run build            # Build all packages
npm run lint             # Lint all
npm run lint:fix         # Fix lint issues
npm run type-check       # Type check all
npm run db:push          # (backend) Push schema
npm run db:migrate       # (backend) Create migration
npm run db:studio        # (backend) Open Prisma UI
```

### Frontend Specific

```bash
npm run dev --workspace=frontend
npm run build --workspace=frontend
npm run lint --workspace=frontend
npm run type-check --workspace=frontend
npm run format --workspace=frontend
```

### Backend Specific

```bash
npm run dev --workspace=backend
npm run build --workspace=backend
npm run lint --workspace=backend
npm run type-check --workspace=backend
npm run db:push --workspace=backend
npm run db:migrate --workspace=backend
npm run db:studio --workspace=backend
```

## Docker Compose Services

### PostgreSQL

- Container: `zoho_erp_db`
- Port: 5432
- User: `zoho_user`
- Password: `zoho_password`
- Database: `zoho_erp_dev`

### Redis (optional cache)

- Container: `zoho_erp_cache`
- Port: 6379

## Quick Start Commands

```bash
# 1. Install all dependencies
npm install

# 2. Start database (Docker)
docker-compose up -d

# 3. Setup backend database
npm run db:push

# 4. Create env files
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env

# 5. Start development
npm run dev

# Frontend: http://localhost:3000
# Backend: http://localhost:5000
# API Proxy: /api/* → localhost:5000/api/*
```

## API Endpoints Available

### Health & Status

- `GET /api/health` - Server health check

### Sample Data

- `GET /api/data` - Get sample data

### Ready to Extend

- Add user authentication
- Add product management
- Add order processing
- Add dashboard endpoints

## TypeScript Features Enabled

Both frontend and backend have strict TypeScript:

✅ Strict null checks
✅ Strict function types
✅ Explicit function return types (enforced)
✅ No implicit any
✅ No unused variables/parameters
✅ No unchecked indexed access
✅ Source maps for debugging
✅ Declaration files generation

## Security Features

✅ CORS enabled and configurable
✅ JWT authentication ready
✅ Environment variable protection
✅ Security headers configured
✅ XSS protection headers
✅ Content-Type nosniff header
✅ X-Frame-Options: DENY
✅ npm audit in CI/CD

## Deployment Ready

### Frontend → Vercel

```bash
npm run build --workspace=frontend
vercel deploy
```

### Backend → Any Node Host

```bash
npm run build --workspace=backend
npm start --workspace=backend
```

## File Sizes (Typical)

- `next.config.ts`: ~1.2 KB
- `tsconfig.json` (frontend): ~1.1 KB
- `tsconfig.json` (backend): ~1.5 KB
- `.eslintrc.json` (frontend): ~0.8 KB
- `.eslintrc.json` (backend): ~0.9 KB
- `prisma/schema.prisma`: ~1.2 KB
- GitHub workflows: ~3 KB total
