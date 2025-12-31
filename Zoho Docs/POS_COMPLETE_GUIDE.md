# Point of Sale (POS) Module - Complete Implementation Guide

## Overview

This document provides a complete guide to the POS module implementation for the multi-branch ERP system, including database schema, backend API, frontend UI, compliance features, and testing.

## Table of Contents

1. [Database Schema](#database-schema)
2. [Backend API](#backend-api)
3. [Frontend UI](#frontend-ui)
4. [Compliance & ETR Integration](#compliance--etr-integration)
5. [Testing](#testing)
6. [Deployment](#deployment)

---

## Database Schema

### Enhanced Prisma Schema

The POS module uses the following database models:

#### Sales Table

```prisma
model Sales {
  id                   String        @id @default(cuid())
  invoice_no           String        @unique
  status               SalesStatus   @default(draft)
  payment_method       PaymentMethod @default(cash)

  // Relationships
  branchId             String
  branch               Branch        @relation(...)
  userId               String
  user                 User          @relation(...)
  createdById          String
  createdBy            User          @relation("CreatedBySales", ...)

  // Financial fields
  subtotal             Float         @default(0)
  total_amount         Float         @default(0)
  discount             Float         @default(0)
  discount_approved_by String?       // Manager ID for discounts > 10%
  tax                  Float         @default(0)
  grand_total          Float         @default(0)
  amount_paid          Float         @default(0)
  change               Float         @default(0)

  // Line items and transactions
  items                SalesItem[]
  finance_transactions FinanceTransaction[]

  // Metadata
  notes                String?
  created_date         DateTime      @default(now())
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
}
```

#### SalesItem Table

```prisma
model SalesItem {
  id               String   @id @default(cuid())
  quantity         Int
  unit_price       Float
  tax_rate         Float    @default(0.16)
  discount         Float    @default(0)
  discount_percent Float    @default(0)
  subtotal         Float
  tax_amount       Float    @default(0)
  amount           Float

  // Relationships
  salesId          String
  sales            Sales    @relation(...)
  productId        String
  product          Product  @relation(...)

  @@unique([salesId, productId])
}
```

#### Enums

```prisma
enum PaymentMethod {
  cash
  card
  mpesa
  cheque
  bank_transfer
}

enum SalesStatus {
  draft
  pending
  confirmed
  shipped
  delivered
  cancelled
  returned
}
```

### Database Migration

Run the following to update your database:

```bash
cd backend
npx prisma db push
# or
npx prisma migrate dev --name add_pos_enhancements
```

---

## Backend API

### Endpoints

#### 1. Product Search

**POST** `/pos/products/search`

Search for products by SKU or barcode.

**Request:**

```json
{
  "search": "LAP-001",
  "branchId": "branch_id_here"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "prod_001",
    "sku": "LAP-001",
    "barcode": "123456789001",
    "name": "Dell Latitude 5420",
    "unit_price": 120000,
    "tax_rate": 0.16,
    "available": 45,
    "inventory": [...]
  }
}
```

#### 2. Create Sale

**POST** `/pos/sales`

Create a new sales transaction.

**Request:**

```json
{
  "branchId": "branch_id",
  "userId": "user_id",
  "payment_method": "mpesa",
  "amount_paid": 140000,
  "discount": 2000,
  "items": [
    {
      "productId": "prod_001",
      "quantity": 1,
      "unit_price": 120000,
      "tax_rate": 0.16,
      "discount": 2000,
      "discount_percent": 1.67
    }
  ]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "sale_001",
    "invoice_no": "WL-001-20241116-0001",
    "status": "confirmed",
    "subtotal": 120000,
    "discount": 2000,
    "tax": 18880,
    "grand_total": 136880,
    "amount_paid": 140000,
    "change": 3120,
    "items": [...]
  }
}
```

#### 3. Get Sale Details

**GET** `/pos/sales/:id`

Retrieve complete sale information.

#### 4. List Sales

**GET** `/pos/sales?page=1&limit=20&branchId=xxx&status=confirmed`

List sales with filtering and pagination.

#### 5. Daily Summary

**GET** `/pos/daily-summary?branch_id=xxx&date=2024-11-16`

Get daily sales summary for a branch.

**Response:**

```json
{
  "success": true,
  "data": {
    "date": "2024-11-16",
    "branchId": "branch_001",
    "branchName": "Westlands Branch",
    "total_sales": 15,
    "total_revenue": 1500000,
    "total_tax": 240000,
    "total_discount": 10000,
    "payment_methods": {
      "cash": 500000,
      "card": 400000,
      "mpesa": 600000,
      "cheque": 0,
      "bank_transfer": 0
    },
    "top_products": [...]
  }
}
```

#### 6. Generate Receipt

**GET** `/pos/sales/:id/receipt`

Get receipt data for printing.

#### 7. Approve Discount

**POST** `/pos/discount/approve`

Manager approval for discounts over 10%.

**Request:**

```json
{
  "salesId": "sale_001",
  "managerId": "manager_id",
  "managerPassword": "password"
}
```

### Business Logic

#### Discount Rules

- Discounts ≤ 10%: No approval required
- Discounts > 10%: Requires manager/admin approval
- Manager must authenticate with password
- Approval is tracked in `discount_approved_by` field

#### Inventory Management

- Inventory is decremented in a database transaction
- Product availability is checked before sale
- Inventory status is updated (in_stock, low_stock, out_of_stock)
- Product total quantity is updated across all warehouses

#### Financial Tracking

- Every sale creates a finance transaction
- Transaction type: "income"
- Amount: grand_total
- Linked to sales record

---

## Frontend UI

### POS Page Components

#### Main Features

1. **Product Search Bar**
   - Barcode scanner support
   - SKU/barcode input
   - Real-time product lookup

2. **Shopping Cart**
   - Item list with quantity controls
   - Per-item discount input
   - Remove item functionality
   - Visual feedback for inventory status

3. **Order Summary**
   - Subtotal calculation
   - Discount display
   - Tax calculation (16% VAT)
   - Grand total
   - Payment method selector
   - Amount paid input with change calculation

4. **Manager Override Dialog**
   - Triggered for discounts > 10%
   - Manager credential input
   - Secure password verification

5. **Receipt Preview**
   - Complete receipt details
   - Company information
   - Branch and cashier details
   - Line items with prices
   - Totals and payment info
   - Print functionality

### UI Components Used

- **shadcn/ui components:**
  - Button, Input, Card
  - Select, Table, Dialog
  - Label, Badge, Separator
  - Toast notifications

### Navigation

```
/pos - POS page (protected route, cashier+ access)
```

### Environment Variables

Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/v1
```

---

## Compliance & ETR Integration

### eTIMS Adapter

The system includes an adapter for Kenya Revenue Authority's electronic Tax Invoice Management System (eTIMS).

#### Configuration

```typescript
const config: eTIMSConfiguration = {
  deviceSerialNumber: "ETR-2024-001",
  cuSerialNumber: "CU-001-2024",
  taxpayerPin: "P051472913Q",
  environment: "sandbox",
};
```

#### Usage

```typescript
import { eTIMSAdapter } from "./etims-adapter";

const adapter = new eTIMSAdapter(config);

// Validate configuration
const validation = adapter.validateConfiguration();

// Convert sale to eTIMS format
const invoice = adapter.convertSaleToInvoice(sale, branch, company);

// Submit to eTIMS
const response = await adapter.submitInvoice(invoice);

// Get receipt data
const receiptData = adapter.getReceiptData(response, sale);
```

#### Receipt Fields for ETR Compliance

- **Fiscal Code:** Unique identifier from eTIMS
- **Receipt Counter:** Sequential number from ETR device
- **Digital Signature:** Cryptographic signature
- **QR Code:** Verification URL
- **Device Serial:** ETR device identifier
- **Control Unit Serial:** CU identifier
- **SDC Date:** Sales Data Controller timestamp

### KRA Classification

Products must be classified using KRA item codes:

- Computers: 84715000
- Electronics: 85176200
- Furniture: 94036000
- Stationery: 48201000

---

## Testing

### Unit Tests

Run tests with:

```bash
cd backend
npm test
```

#### Test Coverage

1. **Sale Creation**
   - ✅ Correct totals calculation
   - ✅ Multiple items handling
   - ✅ Discount application
   - ✅ Unique invoice generation

2. **Inventory Decrement**
   - ✅ Inventory reduction on sale
   - ✅ Product quantity update
   - ✅ Insufficient inventory rejection
   - ✅ Status updates (low_stock, out_of_stock)

3. **Discount Rules**
   - ✅ Allow discount ≤ 10% without approval
   - ✅ Require approval for > 10%
   - ✅ Manager authentication
   - ✅ Role-based authorization

4. **Finance Transaction**
   - ✅ Automatic transaction creation
   - ✅ Correct amount and type

5. **Receipt Generation**
   - ✅ Complete information
   - ✅ Formatting and structure

6. **Daily Summary**
   - ✅ Sales aggregation
   - ✅ Payment method breakdown
   - ✅ Top products calculation

### Integration Testing

Test the complete flow:

1. **Login** → Get JWT token
2. **Search Product** → Find item by SKU/barcode
3. **Create Sale** → Process transaction
4. **Get Receipt** → Retrieve formatted receipt
5. **Daily Summary** → View aggregated data

### API Testing

Use the provided examples in `backend/examples/`:

- `receipt-example.json` - Sample receipt structure

---

## Deployment

### Backend Deployment

1. **Environment Variables:**

```env
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
COMPANY_NAME=Your Company
COMPANY_ADDRESS=Your Address
COMPANY_PHONE=+254...
COMPANY_EMAIL=email@company.com
COMPANY_KRA_PIN=P...
```

2. **Database Migration:**

```bash
npx prisma migrate deploy
```

3. **Start Server:**

```bash
npm run build
npm start
```

### Frontend Deployment

1. **Build:**

```bash
cd frontend
npm run build
```

2. **Environment:**

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/v1
```

3. **Deploy:**

```bash
npm start
```

### Production Checklist

- [ ] Database backups enabled
- [ ] SSL certificates configured
- [ ] Environment variables set
- [ ] ETR device registered with KRA
- [ ] eTIMS API credentials obtained
- [ ] Receipt printer configured
- [ ] Barcode scanner tested
- [ ] User roles assigned
- [ ] Manager credentials created
- [ ] Inventory synchronized
- [ ] Test transactions completed

---

## API Authentication

All endpoints (except login/register) require JWT authentication:

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

### Role-Based Access

- **Cashier:** Can create sales, search products
- **Manager:** All cashier permissions + approve discounts, view summaries
- **Admin:** All permissions

---

## Troubleshooting

### Common Issues

1. **"Insufficient inventory" error**
   - Check product availability in branch warehouse
   - Verify inventory quantities are up to date

2. **"Discount requires manager approval"**
   - Discount exceeds 10% threshold
   - Use manager override dialog
   - Verify manager credentials

3. **"Product not found"**
   - Verify SKU/barcode is correct
   - Check product is active
   - Ensure product has inventory in selected branch

4. **Receipt not printing**
   - Check printer connection
   - Verify browser print permissions
   - Test with receipt preview

---

## Support & Documentation

- **Backend API:** `http://localhost:5000/v1`
- **Frontend:** `http://localhost:3000/pos`
- **Prisma Studio:** `npx prisma studio`
- **Test Suite:** `npm test`

## Next Steps

1. Run database migrations
2. Seed test data: `npm run db:seed`
3. Start backend: `npm run dev`
4. Start frontend: `npm run dev`
5. Test the POS flow
6. Configure ETR integration for production

---

## License

This POS module is part of the Zoho ERP system. All rights reserved.
