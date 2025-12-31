# Prisma ERP Schema - Migration Guide

## 📋 Overview

This comprehensive Prisma schema defines a complete ERP system with:

- **10 main models** (Users, Branches, Warehouses, Products, Inventory, Sales, Trucks, Deliveries, FinanceTransactions, Payroll)
- **UUID primary keys** (using `cuid()`)
- **Timestamps** on all entities (createdAt, updatedAt)
- **Type-safe enums** for roles, statuses, and transaction types
- **Proper relationships** with cascading deletes and referential integrity
- **Indexes** for optimal query performance

---

## 🗂️ Schema Structure

### Enums (6 types)

```
UserRole: cashier, warehouse_staff, driver, manager, admin
InventoryStatus: in_stock, low_stock, out_of_stock, discontinued
SalesStatus: draft, pending, confirmed, shipped, delivered, cancelled, returned
DeliveryStatus: pending, assigned, in_transit, delivered, failed, rescheduled
TransactionType: income, expense, transfer, adjustment
PayrollStatus: draft, submitted, approved, paid, reversed
```

### Models & Relationships

```
┌─────────────────────────────────────────────────────────┐
│                  ORGANIZATION LAYER                      │
├─────────────────────────────────────────────────────────┤
│  User ──┬──> Branch                                      │
│         └──> Payroll                                     │
│              └──> FinanceTransaction                     │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 INVENTORY LAYER                          │
├─────────────────────────────────────────────────────────┤
│  Product ──┬──> Inventory ──> Warehouse                 │
│            └──> SalesItem                                │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   SALES LAYER                            │
├─────────────────────────────────────────────────────────┤
│  Sales ──┬──> SalesItem ──> Product                     │
│          ├──> Branch                                     │
│          ├──> User (seller)                              │
│          ├──> User (created by)                          │
│          ├──> Delivery                                   │
│          └──> FinanceTransaction                         │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                 LOGISTICS LAYER                          │
├─────────────────────────────────────────────────────────┤
│  Delivery ──┬──> Sales                                   │
│             ├──> User (driver)                           │
│             └──> Truck                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                  FINANCE LAYER                           │
├─────────────────────────────────────────────────────────┤
│  FinanceTransaction ──┬──> Sales                         │
│                       └──> Payroll                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Migration Commands

### 1. **First-time Setup**

```bash
# Create initial migration from schema
npm run db:migrate -- --name init_erp_schema

# This will:
# ✓ Generate migration file
# ✓ Execute against development database
# ✓ Generate Prisma Client
```

### 2. **Apply Existing Migrations**

```bash
# Push schema to database (development)
npm run db:push

# Or create migration for review
npm run db:migrate -- --name update_name
```

### 3. **Schema Changes Workflow**

```bash
# After editing schema.prisma:

# Step 1: Generate and run migration
npm run db:migrate -- --name describe_your_change

# Step 2: Type-check your code
npm run type-check --workspace=backend

# Step 3: Test your changes
npm run dev --workspace=backend
```

### 4. **Production Deployment**

```bash
# On production server:

# 1. Review pending migrations
prisma migrate status

# 2. Apply migrations (no prompts)
prisma migrate deploy

# 3. Verify schema
prisma validate
```

### 5. **Reset Database (Development Only)**

```bash
# WARNING: Deletes all data!
npm run db:reset

# This will:
# ✓ Drop and recreate database
# ✓ Run all migrations
# ✓ Seed data (if seed.ts exists)
```

### 6. **View Database (Prisma Studio)**

```bash
# Open interactive UI to view/edit data
npm run db:studio

# Access at: http://localhost:5555
```

---

## 📊 Model Details

### User

- **Purpose**: Users/Employees with roles
- **Key Fields**:
  - `role`: UserRole enum (cashier, warehouse_staff, driver, manager, admin)
  - `branchId`: Optional branch assignment
  - `isActive`: Soft delete support
- **Relations**:
  - Owns sales transactions
  - Assigned payroll records
  - Can be a delivery driver
  - Creates sales records

### Branch

- **Purpose**: Company branches/locations
- **Key Fields**:
  - `code`: Unique branch code
  - `city`, `address`, `phone`: Location info
- **Relations**:
  - Has many users
  - Has many warehouses
  - Has many sales

### Warehouse

- **Purpose**: Storage locations
- **Key Fields**:
  - `capacity`: Total storage capacity
  - `branchId`: Associated branch
- **Relations**:
  - Belongs to one branch
  - Has many inventory records

### Product

- **Purpose**: Products/SKUs
- **Key Fields**:
  - `sku`: Stock Keeping Unit (unique)
  - `barcode`: Optional barcode
  - `unit_price`: Selling price
  - `cost_price`: Cost to company
  - `reorder_level`: Minimum stock level
- **Relations**:
  - Has many inventory records
  - Has many sales items

### Inventory

- **Purpose**: Links products to warehouses
- **Key Fields**:
  - `quantity`: Total units
  - `reserved`: Reserved for pending sales
  - `available`: quantity - reserved
  - `status`: InventoryStatus enum
- **Relations**:
  - Links product ↔ warehouse
  - Unique constraint: (productId, warehouseId)

### Sales

- **Purpose**: Sales orders
- **Key Fields**:
  - `invoice_no`: Unique invoice number
  - `status`: SalesStatus enum
  - `total_amount`, `discount`, `tax`, `grand_total`
- **Relations**:
  - Belongs to branch
  - Assigned to user (cashier/seller)
  - Created by user (creator)
  - Has sales items (line items)
  - Links to delivery

### SalesItem

- **Purpose**: Line items in sales orders
- **Key Fields**:
  - `quantity`, `unit_price`, `discount`
  - `amount`: Calculated line total
- **Relations**:
  - Belongs to sales
  - References product

### Truck

- **Purpose**: Vehicles for delivery
- **Key Fields**:
  - `registration`: Unique registration
  - `capacity`: Load capacity
- **Relations**:
  - Has many deliveries

### Delivery

- **Purpose**: Delivery tracking
- **Key Fields**:
  - `delivery_no`: Unique delivery number
  - `status`: DeliveryStatus enum
  - `destination`: Delivery address
  - `estimated_km`, `actual_km`: Distance tracking
- **Relations**:
  - One-to-one with sales
  - Assigned to driver (user)
  - Uses truck

### FinanceTransaction

- **Purpose**: Financial records
- **Key Fields**:
  - `type`: TransactionType enum
  - `reference_no`: Unique transaction reference
  - `amount`: Transaction amount
  - `payment_method`: cash, check, card, transfer
- **Relations**:
  - Optional link to sales
  - Optional link to payroll

### Payroll

- **Purpose**: Employee salary records
- **Key Fields**:
  - `payroll_no`: Unique payroll number
  - `status`: PayrollStatus enum
  - `base_salary`, `allowances`, `deductions`, `net_salary`
  - `period_start`, `period_end`: Pay period
- **Relations**:
  - Belongs to user
  - Links to finance transactions

---

## 🔑 Key Relationships

### Inventory Management

```
Product (sku) ←→ Inventory ←→ Warehouse (code)
  (1:N)           (1:1)         (1:N)
```

Products are stocked in multiple warehouses with separate inventory records.

### Sales Flow

```
Branch ← Sales → User (cashier)
          ↓
      SalesItem (1:N)
          ↓
      Product
          ↓
      Inventory
          ↓
      Warehouse
```

### Delivery Tracking

```
Sales (1:1)→ Delivery ← User (driver)
             ↓
           Truck
```

### Finance Trail

```
Sales ↘
       ↘→ FinanceTransaction
       ↗
Payroll ↗
```

---

## 🛡️ Data Integrity Features

### Cascading Deletes

```prisma
onDelete: Cascade
```

- Deleting a branch deletes its warehouses
- Deleting sales deletes sales items
- Deleting sales deletes delivery

### Referential Restrictions

```prisma
onDelete: Restrict
```

- Cannot delete product if inventory exists
- Cannot delete user if they have sales/payroll
- Cannot delete branch/warehouse if in use

### Soft Deletes (Optional)

```
isActive Boolean @default(true)
```

Models support soft deletes via `isActive` flag.

---

## 📈 Performance Indexes

### Indexed Fields

- `User.branchId`, `User.email`
- `Branch.code`
- `Warehouse.branchId`, `Warehouse.code`
- `Product.sku`, `Product.barcode`
- `Inventory.productId`, `Inventory.warehouseId`, `Inventory.status`
- `Sales.branchId`, `Sales.userId`, `Sales.status`, `Sales.invoice_no`
- `SalesItem.salesId`, `SalesItem.productId`
- `Delivery.salesId`, `Delivery.driverId`, `Delivery.truckId`, `Delivery.status`
- `FinanceTransaction.type`, `FinanceTransaction.salesId`, `FinanceTransaction.payrollId`
- `Payroll.userId`, `Payroll.status`

### Unique Constraints

- `User.email`
- `Branch.code`
- `Warehouse.code`
- `Product.sku`, `Product.barcode`
- `Inventory`: (productId, warehouseId)
- `Sales.invoice_no`
- `SalesItem`: Related to sales
- `Truck.registration`, `Truck.license_plate`
- `Delivery.delivery_no`, `Delivery.salesId`
- `FinanceTransaction.reference_no`
- `Payroll.payroll_no`

---

## 🔄 Common Queries

### Find Product Inventory Across Warehouses

```typescript
const inventory = await prisma.inventory.findMany({
  where: { productId: "prod-123" },
  include: { warehouse: true, product: true },
});
```

### Get Sales with Items and Customer

```typescript
const sales = await prisma.sales.findUnique({
  where: { id: "sales-456" },
  include: {
    items: { include: { product: true } },
    user: true,
    branch: true,
    delivery: { include: { driver: true, truck: true } },
  },
});
```

### Track Delivery Status

```typescript
const delivery = await prisma.delivery.findUnique({
  where: { delivery_no: "DEL-001" },
  include: {
    sales: { include: { items: true } },
    driver: true,
    truck: true,
  },
});
```

### Get User's Sales (by role)

```typescript
const userSales = await prisma.sales.findMany({
  where: { userId: "user-123" },
  include: { items: true, branch: true },
  orderBy: { created_date: "desc" },
});
```

### Payroll with Finance Trail

```typescript
const payroll = await prisma.payroll.findUnique({
  where: { payroll_no: "PAY-001" },
  include: {
    user: true,
    transactions: true,
  },
});
```

---

## ⚙️ Environment Setup

### `.env` Configuration

```env
DATABASE_URL="postgresql://zoho_user:zoho_password@localhost:5432/zoho_erp_dev"
```

### Connection Pool Settings (Optional)

```env
# For production
DATABASE_URL="postgresql://user:password@host:5432/db?schema=public&connection_limit=5"
```

---

## 🧹 Cleanup & Maintenance

### Generate Prisma Client After Schema Changes

```bash
# Auto-generated when you run migrate/push
# Or manually:
npx prisma generate
```

### Format Schema File

```bash
npx prisma format
```

### Validate Schema Syntax

```bash
npx prisma validate
```

### Check Migration Status

```bash
npx prisma migrate status
```

---

## 📝 Adding New Migrations

### Example: Add User Preferences

```bash
# 1. Edit schema.prisma
# Add UserPreferences model

# 2. Create migration
npm run db:migrate -- --name add_user_preferences

# 3. Apply to database
# (Already done by migrate command)

# 4. Verify
npm run db:studio
```

---

## 🚨 Common Issues & Solutions

### Issue: UUID/CUID not working

**Solution**: Ensure PostgreSQL is running and extensions are installed

```bash
docker-compose up -d
```

### Issue: "Migration already applied"

**Solution**:

```bash
# Check status
prisma migrate status

# If database is out of sync, reset (dev only)
npm run db:reset
```

### Issue: Prisma Client out of sync

**Solution**:

```bash
# Regenerate client
npx prisma generate
```

### Issue: Foreign key constraint violations

**Solution**: Check `onDelete` and `onUpdate` policies

```prisma
@relation(fields: [userId], references: [id], onDelete: Cascade)
```

---

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma Schema Reference](https://www.prisma.io/docs/reference/api-reference/prisma-schema-reference)
- [PostgreSQL Documentation](https://www.postgresql.org/docs)
- [Prisma Relations](https://www.prisma.io/docs/concepts/relations)

---

## ✅ Schema Validation Checklist

Before deploying, verify:

- [ ] All enums are used correctly
- [ ] All relations have proper `onDelete`/`onUpdate` policies
- [ ] UUID/CUID is consistently used for IDs
- [ ] Timestamps (createdAt, updatedAt) on all entities
- [ ] Required fields have `@default` or validation
- [ ] Composite keys and unique constraints defined
- [ ] Indexes on frequently queried fields
- [ ] No circular dependencies (Prisma will warn)
- [ ] Database URL configured in `.env`
- [ ] Migrations reviewed before production

---

**Schema Version**: 1.0.0  
**Last Updated**: November 12, 2025  
**Status**: Production Ready ✅
