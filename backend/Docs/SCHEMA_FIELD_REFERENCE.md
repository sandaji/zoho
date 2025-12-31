# Prisma Schema Reference - Detailed Field Documentation

## Complete ERP Schema Field-by-Field Guide

---

## 🔤 Enums

### UserRole

**Values**: `cashier` | `warehouse_staff` | `driver` | `manager` | `admin`

**Usage**:

- `cashier`: Counter operations, sales
- `warehouse_staff`: Inventory management
- `driver`: Vehicle operations
- `manager`: Branch/department supervision
- `admin`: System administration

```typescript
// Example usage
const admin = await prisma.user.findFirst({
  where: { role: "admin" },
});
```

---

### InventoryStatus

**Values**: `in_stock` | `low_stock` | `out_of_stock` | `discontinued`

**Thresholds** (suggested):

- `in_stock`: quantity > reorder_level
- `low_stock`: 0 < quantity <= reorder_level
- `out_of_stock`: quantity = 0
- `discontinued`: product no longer available

---

### SalesStatus

**Values**: `draft` | `pending` | `confirmed` | `shipped` | `delivered` | `cancelled` | `returned`

**State Flow**:

```
draft → pending → confirmed → shipped → delivered
  ↘                                         ↙
    └─── cancelled ←───── returned ────────┘
```

---

### DeliveryStatus

**Values**: `pending` | `assigned` | `in_transit` | `delivered` | `failed` | `rescheduled`

**State Flow**:

```
pending → assigned → in_transit → delivered
           ↓                        ↑
           └─→ failed → rescheduled ┘
```

---

### TransactionType

**Values**: `income` | `expense` | `transfer` | `adjustment`

**Mapping**:

- `income`: Revenue from sales
- `expense`: Payroll, operations
- `transfer`: Inter-account movements
- `adjustment`: Corrections, write-offs

---

### PayrollStatus

**Values**: `draft` | `submitted` | `approved` | `paid` | `reversed`

**Lifecycle**:

```
draft → submitted → approved → paid
                               ↓
                            reversed (if needed)
```

---

## 👤 User Model

```prisma
model User {
  id        String    @id @default(cuid())
  email     String    @unique
  password  String
  name      String
  phone     String?
  role      UserRole  @default(cashier)
  branchId  String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### Fields

| Field       | Type          | Required | Unique | Notes                       |
| ----------- | ------------- | -------- | ------ | --------------------------- |
| `id`        | String (UUID) | ✓        | ✓      | Primary key, auto-generated |
| `email`     | String        | ✓        | ✓      | Login credential            |
| `password`  | String        | ✓        |        | Hashed password (bcrypt)    |
| `name`      | String        | ✓        |        | Full name                   |
| `phone`     | String?       |          |        | Optional contact            |
| `role`      | UserRole      | ✓        |        | Default: cashier            |
| `branchId`  | String?       |          |        | FK to Branch                |
| `isActive`  | Boolean       | ✓        |        | Default: true               |
| `createdAt` | DateTime      | ✓        |        | Auto-set                    |
| `updatedAt` | DateTime      | ✓        |        | Auto-updated                |

### Relations

- `branch`: Optional one-to-one with Branch
- `sales`: One-to-many sales as cashier
- `createdSales`: One-to-many sales created
- `deliveries`: One-to-many as driver
- `payroll`: One-to-many payroll records

### Indexes

- `branchId` - Filter by branch
- `email` - Fast login lookups

---

## 🏢 Branch Model

```prisma
model Branch {
  id        String    @id @default(cuid())
  code      String    @unique
  name      String
  city      String
  address   String?
  phone     String?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### Fields

| Field       | Type          | Required | Unique | Notes                              |
| ----------- | ------------- | -------- | ------ | ---------------------------------- |
| `id`        | String (UUID) | ✓        | ✓      | Primary key                        |
| `code`      | String        | ✓        | ✓      | Branch identifier (e.g., "BRN001") |
| `name`      | String        | ✓        |        | Display name                       |
| `city`      | String        | ✓        |        | City location                      |
| `address`   | String?       |          |        | Physical address                   |
| `phone`     | String?       |          |        | Contact number                     |
| `isActive`  | Boolean       | ✓        |        | Default: true                      |
| `createdAt` | DateTime      | ✓        |        | Auto-set                           |
| `updatedAt` | DateTime      | ✓        |        | Auto-updated                       |

### Relations

- `users`: One-to-many employees
- `warehouses`: One-to-many locations
- `sales`: One-to-many transactions

### Indexes

- `code` - Fast lookup

---

## 🏭 Warehouse Model

```prisma
model Warehouse {
  id        String    @id @default(cuid())
  code      String    @unique
  name      String
  location  String
  capacity  Int
  branchId  String
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}
```

### Fields

| Field       | Type          | Required | Unique | Notes                          |
| ----------- | ------------- | -------- | ------ | ------------------------------ |
| `id`        | String (UUID) | ✓        | ✓      | Primary key                    |
| `code`      | String        | ✓        | ✓      | Warehouse code (e.g., "WH001") |
| `name`      | String        | ✓        |        | Display name                   |
| `location`  | String        | ✓        |        | Address/coordinates            |
| `capacity`  | Int           | ✓        |        | Total units capacity           |
| `branchId`  | String        | ✓        |        | FK to Branch                   |
| `isActive`  | Boolean       | ✓        |        | Default: true                  |
| `createdAt` | DateTime      | ✓        |        | Auto-set                       |
| `updatedAt` | DateTime      | ✓        |        | Auto-updated                   |

### Relations

- `branch`: Many-to-one with Branch
- `inventory`: One-to-many inventory records

### Indexes

- `branchId` - Filter by branch
- `code` - Fast lookup

---

## 📦 Product Model

```prisma
model Product {
  id            String    @id @default(cuid())
  sku           String    @unique
  barcode       String?   @unique
  name          String
  description   String?
  category      String?
  unit_price    Float
  cost_price    Float
  quantity      Int       @default(0)
  reorder_level Int       @default(10)
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields

| Field           | Type          | Required | Unique | Notes                   |
| --------------- | ------------- | -------- | ------ | ----------------------- |
| `id`            | String (UUID) | ✓        | ✓      | Primary key             |
| `sku`           | String        | ✓        | ✓      | Stock Keeping Unit      |
| `barcode`       | String?       |          | ✓      | EAN/UPC barcode         |
| `name`          | String        | ✓        |        | Product name            |
| `description`   | String?       |          |        | Product details         |
| `category`      | String?       |          |        | Product category        |
| `unit_price`    | Float         | ✓        |        | Selling price per unit  |
| `cost_price`    | Float         | ✓        |        | Cost to company         |
| `quantity`      | Int           | ✓        |        | Total across warehouses |
| `reorder_level` | Int           | ✓        |        | Minimum stock threshold |
| `isActive`      | Boolean       | ✓        |        | Default: true           |
| `createdAt`     | DateTime      | ✓        |        | Auto-set                |
| `updatedAt`     | DateTime      | ✓        |        | Auto-updated            |

### Relations

- `inventory`: One-to-many inventory records
- `sales_items`: One-to-many line items

### Indexes

- `sku` - Fast product lookup
- `barcode` - Barcode scanning

---

## 📊 Inventory Model

```prisma
model Inventory {
  id            String    @id @default(cuid())
  quantity      Int       @default(0)
  reserved      Int       @default(0)
  available     Int       @default(0)
  status        InventoryStatus @default(in_stock)
  last_counted  DateTime?
  productId     String
  warehouseId   String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields

| Field          | Type            | Required | Unique | Notes                    |
| -------------- | --------------- | -------- | ------ | ------------------------ |
| `id`           | String (UUID)   | ✓        | ✓      | Primary key              |
| `quantity`     | Int             | ✓        |        | Total units in warehouse |
| `reserved`     | Int             | ✓        |        | Units reserved for sales |
| `available`    | Int             | ✓        |        | quantity - reserved      |
| `status`       | InventoryStatus | ✓        |        | Current status           |
| `last_counted` | DateTime?       |          |        | Last stock count date    |
| `productId`    | String          | ✓        |        | FK to Product            |
| `warehouseId`  | String          | ✓        |        | FK to Warehouse          |
| `createdAt`    | DateTime        | ✓        |        | Auto-set                 |
| `updatedAt`    | DateTime        | ✓        |        | Auto-updated             |

### Constraints

- **Unique**: (productId, warehouseId) - One inventory per product per warehouse

### Relations

- `product`: Many-to-one with Product
- `warehouse`: Many-to-one with Warehouse

### Indexes

- `productId` - Find products
- `warehouseId` - Warehouse contents
- `status` - Filter by status

### Calculation Logic

```typescript
available = quantity - reserved;
// Update on every sales/receipt
```

---

## 🛒 Sales Model

```prisma
model Sales {
  id            String    @id @default(cuid())
  invoice_no    String    @unique
  status        SalesStatus @default(draft)
  branchId      String
  userId        String
  createdById   String
  total_amount  Float     @default(0)
  discount      Float     @default(0)
  tax           Float     @default(0)
  grand_total   Float     @default(0)
  notes         String?
  created_date  DateTime  @default(now())
  delivery_date DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields

| Field           | Type          | Required | Unique | Notes                              |
| --------------- | ------------- | -------- | ------ | ---------------------------------- |
| `id`            | String (UUID) | ✓        | ✓      | Primary key                        |
| `invoice_no`    | String        | ✓        | ✓      | Invoice number (e.g., "INV-001")   |
| `status`        | SalesStatus   | ✓        |        | Default: draft                     |
| `branchId`      | String        | ✓        |        | FK to Branch                       |
| `userId`        | String        | ✓        |        | FK to User (seller)                |
| `createdById`   | String        | ✓        |        | FK to User (creator)               |
| `total_amount`  | Float         | ✓        |        | Sum of items (before discount/tax) |
| `discount`      | Float         | ✓        |        | Total discount                     |
| `tax`           | Float         | ✓        |        | Tax amount                         |
| `grand_total`   | Float         | ✓        |        | Final total                        |
| `notes`         | String?       |          |        | Order notes                        |
| `created_date`  | DateTime      | ✓        |        | Order date                         |
| `delivery_date` | DateTime?     |          |        | Expected delivery                  |
| `createdAt`     | DateTime      | ✓        |        | Auto-set                           |
| `updatedAt`     | DateTime      | ✓        |        | Auto-updated                       |

### Relations

- `branch`: Many-to-one with Branch
- `user`: Many-to-one with User (cashier)
- `createdBy`: Many-to-one with User (creator)
- `items`: One-to-many SalesItems
- `delivery`: One-to-one Delivery

### Indexes

- `branchId` - Branch sales
- `userId` - User sales
- `createdById` - Created by filter
- `status` - Status filtering
- `invoice_no` - Invoice lookup

### Calculations

```typescript
total_amount = SUM(items.amount);
grand_total = total_amount - discount + tax;
```

---

## 📄 SalesItem Model

```prisma
model SalesItem {
  id            String    @id @default(cuid())
  quantity      Int
  unit_price    Float
  discount      Float     @default(0)
  amount        Float
  salesId       String
  productId     String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields

| Field        | Type          | Required | Unique | Notes                    |
| ------------ | ------------- | -------- | ------ | ------------------------ |
| `id`         | String (UUID) | ✓        | ✓      | Primary key              |
| `quantity`   | Int           | ✓        |        | Units ordered            |
| `unit_price` | Float         | ✓        |        | Price per unit           |
| `discount`   | Float         | ✓        |        | Line discount            |
| `amount`     | Float         | ✓        |        | (qty × price) - discount |
| `salesId`    | String        | ✓        |        | FK to Sales              |
| `productId`  | String        | ✓        |        | FK to Product            |
| `createdAt`  | DateTime      | ✓        |        | Auto-set                 |
| `updatedAt`  | DateTime      | ✓        |        | Auto-updated             |

### Relations

- `sales`: Many-to-one with Sales
- `product`: Many-to-one with Product

### Indexes

- `salesId` - Get sale items
- `productId` - Product references

---

## 🚚 Truck Model

```prisma
model Truck {
  id            String    @id @default(cuid())
  registration  String    @unique
  model         String
  capacity      Int
  license_plate String?   @unique
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields

| Field           | Type          | Required | Unique | Notes                 |
| --------------- | ------------- | -------- | ------ | --------------------- |
| `id`            | String (UUID) | ✓        | ✓      | Primary key           |
| `registration`  | String        | ✓        | ✓      | Vehicle registration  |
| `model`         | String        | ✓        |        | Vehicle model         |
| `capacity`      | Int           | ✓        |        | Load capacity (units) |
| `license_plate` | String?       |          | ✓      | License plate number  |
| `isActive`      | Boolean       | ✓        |        | Default: true         |
| `createdAt`     | DateTime      | ✓        |        | Auto-set              |
| `updatedAt`     | DateTime      | ✓        |        | Auto-updated          |

### Relations

- `deliveries`: One-to-many Deliveries

### Indexes

- `registration` - Vehicle lookup

---

## 📮 Delivery Model

```prisma
model Delivery {
  id            String    @id @default(cuid())
  delivery_no   String    @unique
  status        DeliveryStatus @default(pending)
  salesId       String    @unique
  driverId      String
  truckId       String
  destination   String
  estimated_km  Int?
  actual_km     Int?
  scheduled_date DateTime?
  picked_up_at  DateTime?
  delivered_at  DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields

| Field            | Type           | Required | Unique | Notes                    |
| ---------------- | -------------- | -------- | ------ | ------------------------ |
| `id`             | String (UUID)  | ✓        | ✓      | Primary key              |
| `delivery_no`    | String         | ✓        | ✓      | Delivery number          |
| `status`         | DeliveryStatus | ✓        |        | Default: pending         |
| `salesId`        | String         | ✓        | ✓      | FK to Sales (one-to-one) |
| `driverId`       | String         | ✓        |        | FK to User (driver)      |
| `truckId`        | String         | ✓        |        | FK to Truck              |
| `destination`    | String         | ✓        |        | Delivery address         |
| `estimated_km`   | Int?           |          |        | Estimated distance       |
| `actual_km`      | Int?           |          |        | Actual distance traveled |
| `scheduled_date` | DateTime?      |          |        | Scheduled delivery date  |
| `picked_up_at`   | DateTime?      |          |        | Pickup timestamp         |
| `delivered_at`   | DateTime?      |          |        | Delivery timestamp       |
| `notes`          | String?        |          |        | Delivery notes           |
| `createdAt`      | DateTime       | ✓        |        | Auto-set                 |
| `updatedAt`      | DateTime       | ✓        |        | Auto-updated             |

### Relations

- `sales`: One-to-one with Sales
- `driver`: Many-to-one with User
- `truck`: Many-to-one with Truck

### Indexes

- `salesId` - Sale deliveries
- `driverId` - Driver deliveries
- `truckId` - Truck usage
- `status` - Status filtering
- `delivery_no` - Delivery lookup

---

## 💰 FinanceTransaction Model

```prisma
model FinanceTransaction {
  id            String    @id @default(cuid())
  type          TransactionType
  reference_no  String    @unique
  description   String
  amount        Float
  salesId       String?
  payrollId     String?
  payment_method String?
  reference_doc String?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields

| Field            | Type            | Required | Unique | Notes                                 |
| ---------------- | --------------- | -------- | ------ | ------------------------------------- |
| `id`             | String (UUID)   | ✓        | ✓      | Primary key                           |
| `type`           | TransactionType | ✓        |        | income, expense, transfer, adjustment |
| `reference_no`   | String          | ✓        | ✓      | Transaction reference                 |
| `description`    | String          | ✓        |        | Transaction details                   |
| `amount`         | Float           | ✓        |        | Amount in currency                    |
| `salesId`        | String?         |          |        | Optional FK to Sales                  |
| `payrollId`      | String?         |          |        | Optional FK to Payroll                |
| `payment_method` | String?         |          |        | cash, check, card, transfer           |
| `reference_doc`  | String?         |          |        | Invoice/receipt number                |
| `notes`          | String?         |          |        | Additional notes                      |
| `createdAt`      | DateTime        | ✓        |        | Auto-set                              |
| `updatedAt`      | DateTime        | ✓        |        | Auto-updated                          |

### Relations

- `sales`: Optional many-to-one with Sales
- `payroll`: Optional many-to-one with Payroll

### Indexes

- `type` - Filter by type
- `reference_no` - Transaction lookup
- `salesId` - Sale transactions
- `payrollId` - Payroll transactions

---

## 💵 Payroll Model

```prisma
model Payroll {
  id            String    @id @default(cuid())
  payroll_no    String    @unique
  status        PayrollStatus @default(draft)
  userId        String
  base_salary   Float
  allowances    Float     @default(0)
  deductions    Float     @default(0)
  net_salary    Float
  period_start  DateTime
  period_end    DateTime
  paid_date     DateTime?
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Fields

| Field          | Type          | Required | Unique | Notes                             |
| -------------- | ------------- | -------- | ------ | --------------------------------- |
| `id`           | String (UUID) | ✓        | ✓      | Primary key                       |
| `payroll_no`   | String        | ✓        | ✓      | Payroll number                    |
| `status`       | PayrollStatus | ✓        |        | Default: draft                    |
| `userId`       | String        | ✓        |        | FK to User (employee)             |
| `base_salary`  | Float         | ✓        |        | Base monthly salary               |
| `allowances`   | Float         | ✓        |        | Additional allowances             |
| `deductions`   | Float         | ✓        |        | Deductions (tax, insurance, etc.) |
| `net_salary`   | Float         | ✓        |        | base + allowances - deductions    |
| `period_start` | DateTime      | ✓        |        | Pay period start                  |
| `period_end`   | DateTime      | ✓        |        | Pay period end                    |
| `paid_date`    | DateTime?     |          |        | Payment date                      |
| `notes`        | String?       |          |        | Payroll notes                     |
| `createdAt`    | DateTime      | ✓        |        | Auto-set                          |
| `updatedAt`    | DateTime      | ✓        |        | Auto-updated                      |

### Relations

- `user`: Many-to-one with User
- `transactions`: One-to-many FinanceTransactions

### Indexes

- `userId` - Employee payroll
- `status` - Status filtering
- `payroll_no` - Payroll lookup

### Calculations

```typescript
net_salary = base_salary + allowances - deductions;
```

---

## 🔗 Relationship Cardinality Reference

| From      | To                 | Relation      | Cardinality |
| --------- | ------------------ | ------------- | ----------- |
| User      | Branch             | `branchId`    | N:1         |
| User      | Sales (seller)     | `userId`      | 1:N         |
| User      | Sales (creator)    | `createdById` | 1:N         |
| User      | Delivery (driver)  | `driverId`    | 1:N         |
| User      | Payroll            | `userId`      | 1:N         |
| Branch    | Warehouse          | —             | 1:N         |
| Branch    | Sales              | `branchId`    | 1:N         |
| Warehouse | Inventory          | —             | 1:N         |
| Product   | Inventory          | —             | 1:N         |
| Product   | SalesItem          | —             | 1:N         |
| Sales     | SalesItem          | —             | 1:N         |
| Sales     | Delivery           | —             | 1:1         |
| Sales     | FinanceTransaction | —             | 1:N         |
| Delivery  | Truck              | `truckId`     | N:1         |
| Delivery  | User (driver)      | `driverId`    | N:1         |
| Payroll   | FinanceTransaction | —             | 1:N         |

---

**Last Updated**: November 12, 2025  
**Version**: 1.0.0
