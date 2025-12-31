# Backend Scaffolding - Complete Guide

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Date**: November 12, 2025

---

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Directory Structure](#directory-structure)
3. [Module Architecture](#module-architecture)
4. [Core Components](#core-components)
5. [API Endpoints](#api-endpoints)
6. [Running the Server](#running-the-server)
7. [Development Workflow](#development-workflow)
8. [Code Examples](#code-examples)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The backend follows a **modular, layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    Express Application                       │
│  (app.ts - middleware, CORS, error handling, health check)  │
└──────────────────┬──────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────────┐
│                   API Routes (v1)                            │
│  (routes/index.ts - endpoint registration)                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┬───────────────┬─────────────┬──────────────┬──────────────┐
        │                     │               │             │              │              │
┌───────▼──────┐ ┌─────────────▼──────┐ ┌────▼─────┐ ┌────▼──────┐ ┌────▼──────┐ ┌──▼─────────┐
│  POS Module  │ │ Inventory Module   │ │Warehouse │ │Fleet Mgmt │ │HR Module  │ │   Finance  │
│ (Sales Mgmt) │ │ (Stock Tracking)   │ │ (Warehouses)│ (Trucks, │ │ (Users,   │ │ (Accounts  │
│              │ │                    │ │          │ │Deliveries)│ │ Payroll)  │ │ & Reports) │
└──────────────┘ └────────────────────┘ └──────────┘ └──────────┘ └───────────┘ └────────────┘
        │               │                 │           │            │              │
        │               │ ┌────────────────────────────────────────────────────────┤
        │               │ │         Each Module Contains:                        │
        │               │ │  ├── controller/ (HTTP handlers)                    │
        │               │ │  ├── service/    (business logic)                   │
        │               │ │  └── dto/        (data contracts)                   │
        │               │ └────────────────────────────────────────────────────────┤
        │               │
        └───────────────┴─────────────────────────────────────┬───────────────────┘
                                                              │
                        ┌─────────────────────────────────────┴──────────┐
                        │          Common Utilities                      │
                        │  ├── database.ts (Prisma setup)              │
                        │  ├── logger.ts   (structured logging)        │
                        │  └── errors.ts   (error handling)            │
                        └───────────────────────────────────────────────┘
```

---

## Directory Structure

```
backend/
├── src/
│   ├── index.ts                          # Entry point (bootstrap server)
│   ├── app.ts                            # Express app setup
│   │
│   ├── common/                           # Shared utilities
│   │   ├── database.ts                   # Prisma client & initialization
│   │   ├── logger.ts                     # Structured logging
│   │   └── errors.ts                     # Error classes & factory functions
│   │
│   ├── modules/                          # Feature modules
│   │   ├── pos/                          # Point of Sale
│   │   │   ├── controller/index.ts       # HTTP request handlers
│   │   │   ├── service/index.ts          # Business logic
│   │   │   └── dto/index.ts              # Data transfer objects
│   │   │
│   │   ├── inventory/                    # Inventory Management
│   │   │   ├── controller/index.ts
│   │   │   ├── service/index.ts
│   │   │   └── dto/index.ts
│   │   │
│   │   ├── warehouse/                    # Warehouse Management
│   │   │   ├── controller/index.ts
│   │   │   ├── service/index.ts
│   │   │   └── dto/index.ts
│   │   │
│   │   ├── fleet/                        # Fleet & Delivery Management
│   │   │   ├── controller/index.ts
│   │   │   ├── service/index.ts
│   │   │   └── dto/index.ts
│   │   │
│   │   ├── hr/                           # Human Resources
│   │   │   ├── controller/index.ts
│   │   │   ├── service/index.ts
│   │   │   └── dto/index.ts
│   │   │
│   │   └── finance/                      # Finance & Accounting
│   │       ├── controller/index.ts
│   │       ├── service/index.ts
│   │       └── dto/index.ts
│   │
│   ├── routes/                           # API routing
│   │   └── index.ts                      # v1 route registration
│   │
│   ├── types/                            # TypeScript definitions
│   │   └── index.ts                      # Shared types (from previous setup)
│   │
│   └── prisma/                           # Database
│       ├── schema.prisma                 # Schema definition
│       └── migrations/                   # Database migrations
│
├── package.json                          # Dependencies & scripts
├── tsconfig.json                         # TypeScript config
├── .env.example                          # Environment template
└── BACKEND_SCAFFOLDING.md                # This file

```

---

## Module Architecture

Each module follows the **Controller → Service → DTO** pattern:

### DTO Layer (Data Transfer Objects)

**File**: `modules/[name]/dto/index.ts`

Defines the API contracts for request/response validation:

```typescript
// Example: POS DTOs
export interface CreateSalesDTO {
  branchId: string;
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    unit_price: number;
    discount?: number;
  }>;
  discount?: number;
  tax?: number;
  notes?: string;
}

export interface SalesResponseDTO {
  id: string;
  invoice_no: string;
  status: string;
  // ... other fields
}
```

**Benefits**:

- ✅ Type-safe API contracts
- ✅ Clear documentation
- ✅ Easy validation
- ✅ Reusable across layers

### Service Layer

**File**: `modules/[name]/service/index.ts`

Contains all business logic, database operations, and validation:

```typescript
export class PosService {
  private prisma = getPrismaClient();

  async createSales(dto: CreateSalesDTO): Promise<SalesResponseDTO> {
    // Validate inventory
    // Calculate totals
    // Create in database
    // Return formatted response
  }

  async updateSales(
    id: string,
    dto: UpdateSalesDTO
  ): Promise<SalesResponseDTO> {
    // Validate status transition
    // Update in database
    // Return formatted response
  }
}
```

**Responsibilities**:

- ✅ Business logic
- ✅ Data validation
- ✅ Database operations (via Prisma)
- ✅ Error handling
- ✅ Logging

### Controller Layer

**File**: `modules/[name]/controller/index.ts`

Handles HTTP requests/responses and delegates to service:

```typescript
export class PosController {
  private service = new PosService();

  async createSales(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreateSalesDTO = req.body;

      // Validate input
      if (!dto.branchId || !dto.userId) {
        throw validationError("Missing required fields");
      }

      // Call service
      const result = await this.service.createSales(dto);

      // Send response
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error); // Pass to error handler
    }
  }
}
```

**Responsibilities**:

- ✅ Parse HTTP requests
- ✅ Validate input parameters
- ✅ Call service methods
- ✅ Format HTTP responses
- ✅ Error handling delegation

---

## Core Components

### 1. Database Layer (`src/common/database.ts`)

Manages Prisma client initialization and connection:

```typescript
// Get client instance
const prisma = getPrismaClient();

// Use in services
const user = await prisma.user.findUnique({ where: { id: "..." } });

// Initialize database on app startup
await initializeDatabase();

// Disconnect on shutdown
await disconnectDatabase();
```

**Features**:

- ✅ Singleton Prisma client
- ✅ Query logging in development
- ✅ Error event handling
- ✅ Database health check

### 2. Logger (`src/common/logger.ts`)

Structured logging with different levels:

```typescript
logger.debug("Debug message", { data: "value" });
logger.info("Info message", { data: "value" });
logger.warn("Warning message", { data: "value" });
logger.error("Error message", errorObject);

// Specific logging
logger.httpRequest("POST", "/api/sales", 201, 125); // 125ms duration
logger.query("SELECT * FROM users", 50, { count: 10 });
```

**Levels**: DEBUG, INFO, WARN, ERROR

### 3. Error Handling (`src/common/errors.ts`)

Custom error classes with HTTP status codes:

```typescript
// Predefined errors
throw validationError("Field is required");
throw notFoundError("User", id);
throw insufficientInventoryError(productId, required, available);
throw conflictError("Email already exists");
throw unauthorizedError();
throw forbiddenError();

// Custom error
throw new AppError(ErrorCode.INVALID_INPUT, 400, "Custom error message", {
  field: "value",
});
```

**Error Structure**:

```typescript
{
  code: 'ERROR_CODE',
  message: 'Human readable message',
  details: { /* additional data */ },
  timestamp: '2025-11-12T10:30:00.000Z'
}
```

---

## API Endpoints

### Health Check

```bash
GET /health

Response:
{
  "status": "ok",
  "timestamp": "2025-11-12T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "development"
}
```

### POS Module (`/pos`)

```
POST   /pos/sales                  # Create sales order
GET    /pos/sales                  # List sales orders (paginated)
GET    /pos/sales/:id              # Get single sales order
PATCH  /pos/sales/:id              # Update sales order
```

**Example**: Create sales order

```bash
POST /pos/sales
Content-Type: application/json

{
  "branchId": "...",
  "userId": "...",
  "items": [
    {
      "productId": "...",
      "quantity": 2,
      "unit_price": 100,
      "discount": 5
    }
  ],
  "discount": 0,
  "tax": 15,
  "notes": "..."
}

Response:
{
  "success": true,
  "data": {
    "id": "...",
    "invoice_no": "INV-1731415200000",
    "status": "draft",
    "total_amount": 215,
    "items": [...]
  }
}
```

### Inventory Module (`/inventory`)

```
GET    /inventory                         # List inventory (paginated)
GET    /inventory/:productId/:warehouseId # Get specific inventory
PATCH  /inventory/:productId/:warehouseId # Update inventory
POST   /inventory/adjust                  # Adjust stock
```

### Warehouse Module (`/warehouse`)

```
POST   /warehouse              # Create warehouse
GET    /warehouse              # List warehouses (paginated)
GET    /warehouse/:id          # Get warehouse
PATCH  /warehouse/:id          # Update warehouse
GET    /warehouse/:id/stock    # Get warehouse stock details
```

### Fleet Module (`/fleet`)

```
# Trucks
POST   /fleet/trucks            # Create truck
GET    /fleet/trucks/:id        # Get truck
PATCH  /fleet/trucks/:id        # Update truck

# Deliveries
POST   /fleet/deliveries        # Create delivery
GET    /fleet/deliveries        # List deliveries (paginated)
GET    /fleet/deliveries/:id    # Get delivery
PATCH  /fleet/deliveries/:id    # Update delivery
```

### HR Module (`/hr`)

```
# Users
POST   /hr/users              # Create user
GET    /hr/users/:id          # Get user
PATCH  /hr/users/:id          # Update user

# Payroll
POST   /hr/payroll            # Create payroll record
GET    /hr/payroll            # List payroll (paginated)
GET    /hr/payroll/:id        # Get payroll record
PATCH  /hr/payroll/:id        # Update payroll record
```

### Finance Module (`/finance`)

```
POST   /finance/transactions          # Create transaction
GET    /finance/transactions          # List transactions (paginated)
GET    /finance/transactions/:id      # Get transaction
PATCH  /finance/transactions/:id      # Update transaction
GET    /finance/report                # Financial report
GET    /finance/analytics/revenue     # Revenue analytics
```

---

## Running the Server

### Prerequisites

- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Environment Setup

1. **Create `.env` file** (from `.env.example`):

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/zoho_erp"
NODE_ENV="development"
PORT=5000
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your-secret-key-here"
```

2. **Install dependencies**:

```bash
npm install
```

3. **Initialize database**:

```bash
npm run db:migrate -- --name init_schema
```

### Development

```bash
# Start dev server (with auto-reload)
npm run dev

# Output:
# 🚀 Starting ERP Backend Server...
# 📝 Environment: development
# ✅ Server running on http://localhost:5000
# 🔗 Health check: http://localhost:5000/health
```

### Production

```bash
# Build
npm run build

# Start
npm start
```

---

## Development Workflow

### 1. Adding a New Endpoint

**Step 1**: Create DTO

```typescript
// modules/feature/dto/index.ts
export interface CreateFeatureDTO {
  name: string;
  description?: string;
}

export interface FeatureResponseDTO {
  id: string;
  name: string;
  description?: string;
}
```

**Step 2**: Create Service

```typescript
// modules/feature/service/index.ts
export class FeatureService {
  private prisma = getPrismaClient();

  async createFeature(dto: CreateFeatureDTO): Promise<FeatureResponseDTO> {
    const feature = await this.prisma.feature.create({
      data: dto,
    });
    return feature;
  }
}
```

**Step 3**: Create Controller

```typescript
// modules/feature/controller/index.ts
export class FeatureController {
  private service = new FeatureService();

  async createFeature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreateFeatureDTO = req.body;
      const result = await this.service.createFeature(dto);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
```

**Step 4**: Register Route

```typescript
// routes/index.ts
router.post("/feature", (req, res, next) =>
  featureController.createFeature(req, res, next)
);
```

### 2. Adding Database Fields

**Step 1**: Update Prisma Schema

```prisma
model Feature {
  id String @id @default(cuid())
  name String
  description String?  // New field
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Step 2**: Create Migration

```bash
npm run db:migrate -- --name add_feature_description
```

**Step 3**: Update Service/DTO as needed

### 3. Error Handling Best Practices

```typescript
// ✅ Good
try {
  const result = await this.prisma.user.findUnique({ where: { id } });
  if (!result) {
    throw notFoundError("User", id);
  }
} catch (error) {
  logger.error("Failed to fetch user", error as Error);
  throw error; // Let error handler deal with it
}

// ❌ Avoid
if (!result) {
  res.status(404).json({ error: "Not found" }); // Direct response
}
```

---

## Code Examples

### Example 1: Creating a Sales Order

**Request**:

```bash
curl -X POST http://localhost:5000/pos/sales \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch1",
    "userId": "user1",
    "items": [
      {
        "productId": "prod1",
        "quantity": 2,
        "unit_price": 100,
        "discount": 5
      }
    ],
    "tax": 10
  }'
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "cid123",
    "invoice_no": "INV-1731415200000",
    "status": "draft",
    "branchId": "branch1",
    "userId": "user1",
    "total_amount": 195,
    "discount": 0,
    "tax": 10,
    "grand_total": 205,
    "items": [
      {
        "id": "item1",
        "productId": "prod1",
        "quantity": 2,
        "unit_price": 100,
        "discount": 5,
        "amount": 195
      }
    ],
    "created_date": "2025-11-12T10:30:00.000Z"
  }
}
```

### Example 2: Adjusting Stock

**Request**:

```bash
curl -X POST http://localhost:5000/inventory/adjust \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod1",
    "warehouseId": "wh1",
    "quantity": 50,
    "reason": "Stock received from supplier",
    "reference": "PO-12345"
  }'
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "inv1",
    "productId": "prod1",
    "warehouseId": "wh1",
    "quantity": 150,
    "reserved": 0,
    "available": 150,
    "status": "in_stock"
  },
  "message": "Stock adjusted by 50 units"
}
```

### Example 3: Listing with Pagination

**Request**:

```bash
curl "http://localhost:5000/hr/payroll?page=1&limit=10&status=approved"
```

**Response**:

```json
{
  "success": true,
  "data": [
    {
      "id": "pay1",
      "payroll_no": "PAY-123",
      "status": "approved",
      "userId": "user1",
      "base_salary": 5000,
      "allowances": 500,
      "deductions": 200,
      "net_salary": 5300,
      "period_start": "2025-11-01T00:00:00.000Z",
      "period_end": "2025-11-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10
  }
}
```

---

## Troubleshooting

### Database Connection Error

**Problem**: `Cannot reach database`

**Solution**:

```bash
# Check if PostgreSQL is running
docker-compose ps

# Verify DATABASE_URL
cat backend/.env

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### TypeScript Errors

**Problem**: `Type 'X' is not assignable to type 'Y'`

**Solution**:

```bash
# Type check
npm run type-check

# Check specific file
npx tsc src/modules/pos/service/index.ts --noEmit
```

### Module Not Found

**Problem**: `Cannot find module '@/modules/pos'`

**Solution**:

- Check file paths (case-sensitive on Linux/Mac)
- Verify export statements
- Run `npm install`

### Port Already in Use

**Problem**: `EADDRINUSE: address already in use :::5000`

**Solution**:

```bash
# Find process using port
lsof -i :5000

# Kill process
kill -9 <PID>

# Or change port
PORT=5000 npm run dev
```

### Database Migration Failed

**Problem**: `Migration has pending conflict`

**Solution**:

```bash
# Check status
npx prisma migrate status

# Resolve conflict
npx prisma migrate resolve --applied "<migration-name>"

# Or reset (DEV ONLY!)
npm run db:reset
```

---

## Performance Tips

1. **Add Indexes** to frequently queried fields

   ```prisma
   model Sales {
     @@index([branchId])
     @@index([status])
     @@index([created_date])
   }
   ```

2. **Use Pagination** in list endpoints

   ```typescript
   const page = query.page || 1;
   const limit = query.limit || 20;
   const skip = (page - 1) * limit;
   ```

3. **Enable Connection Pooling** in production

   ```env
   DATABASE_URL="postgresql://user:pass@host/db?schema=public&pgbouncer=true"
   ```

4. **Use Select/Include** judiciously

   ```typescript
   // ✅ Only get needed fields
   await prisma.user.findMany({
     select: { id: true, name: true, email: true },
   });

   // ❌ Gets everything
   await prisma.user.findMany();
   ```

---

## Summary

This backend scaffolding provides:

✅ **Modular Architecture**: 6 independent feature modules  
✅ **Type Safety**: Full TypeScript with strict mode  
✅ **Error Handling**: Structured error classes  
✅ **Logging**: Production-grade logging  
✅ **Database**: Prisma ORM integration  
✅ **Scalability**: Ready for growth  
✅ **Development**: Hot reload with tsx  
✅ **Production**: Build and run ready

**Next Steps**:

1. Run `npm install` to get dependencies
2. Run `npm run db:migrate` to create tables
3. Run `npm run dev` to start server
4. Check health: `GET http://localhost:5000/health`
5. Start building APIs!

---

**Happy coding! 🚀**
