# POS System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         POS SYSTEM                              │
│                    Commercial Grade v1.0                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js 14 + React 18 + TypeScript + Tailwind CSS            │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │  /dashboard/pos (Main POS Interface)                      │ │
│  │  ┌────────────┬────────────┬──────────────┐             │ │
│  │  │ New Sale   │  History   │   Reports    │             │ │
│  │  └────────────┴────────────┴──────────────┘             │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Components:                                                    │
│  ├─ POSCart              (Shopping cart management)           │
│  ├─ POSPayment           (Payment processing UI)              │
│  ├─ POSSaleSuccess       (Success modal + receipt)            │
│  ├─ POSHistory           (Sales history + filters)            │
│  ├─ POSCashier           (Cashier info display)              │
│  └─ POSQuickActions      (Quick action buttons)              │
│                                                                 │
│  State Management:                                              │
│  ├─ Cart Items (useState)                                      │
│  ├─ Payment Method (useState)                                  │
│  ├─ Customer Info (useState)                                   │
│  └─ Totals (useMemo - calculated)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST API
                              │ (Authentication: JWT)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Node.js + Express + TypeScript + Prisma ORM                   │
│                                                                 │
│  API Endpoints:                                                 │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ POST   /api/sales/pos/sales        (Create sale)      │   │
│  │ GET    /api/sales/pos/sales        (Get history)      │   │
│  │ GET    /api/sales/pos/sales/:id    (Get one sale)     │   │
│  │ POST   /api/sales/documents        (Create document)  │   │
│  │ POST   /api/sales/documents/:id/convert (Convert)     │   │
│  │ POST   /api/sales/documents/:id/void    (Void doc)    │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Controllers:                                                   │
│  └─ SalesController (Request/Response handling)               │
│                                                                 │
│  Services:                                                      │
│  ├─ SalesService        (Business logic)                      │
│  └─ SequenceService     (Document numbering)                  │
│                                                                 │
│  Validation:                                                    │
│  └─ Zod Schemas (Input validation)                            │
│                                                                 │
│  Middleware:                                                    │
│  ├─ authenticate()      (JWT verification)                     │
│  └─ authorize()         (Role-based access)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Prisma ORM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL 14+                                                 │
│                                                                 │
│  Tables:                                                        │
│  ┌────────────────────────────────────────────────────────┐   │
│  │ sales_documents                                        │   │
│  │ ├─ id, documentId (INV-0001)                          │   │
│  │ ├─ type, status                                        │   │
│  │ ├─ amounts (subtotal, tax, total)                     │   │
│  │ └─ customer info, timestamps                          │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ sales_document_items                                   │   │
│  │ ├─ documentId → sales_documents                       │   │
│  │ ├─ productId → products                               │   │
│  │ └─ quantity, prices, calculations                     │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ payments                                               │   │
│  │ ├─ documentId → sales_documents                       │   │
│  │ ├─ amount, method, reference                          │   │
│  │ └─ userId, timestamps                                 │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ inventory_transactions                                 │   │
│  │ ├─ productId → products                               │   │
│  │ ├─ type (SALE), quantity (negative)                   │   │
│  │ └─ referenceId, timestamps                            │   │
│  ├────────────────────────────────────────────────────────┤   │
│  │ document_sequences                                     │   │
│  │ ├─ branchId, type                                     │   │
│  │ ├─ prefix (INV, QTN, CRN)                            │   │
│  │ └─ nextNumber (auto-increment)                        │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Relationships:                                                 │
│  ├─ sales_documents → sales_document_items (1:N)              │
│  ├─ sales_documents → payments (1:N)                          │
│  ├─ sales_documents → inventory_transactions (1:N)            │
│  └─ sales_documents → users, branches, customers              │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: POS Sale Transaction

```
┌──────────────┐
│   CASHIER    │
└──────┬───────┘
       │ 1. Search Products
       ▼
┌─────────────────────────┐
│  AutocompleteSearch     │  ← Product list with autocomplete
└────────┬────────────────┘
         │ 2. Select Product
         ▼
┌─────────────────────────┐
│     POSCart State       │
│  ├─ Add to cart         │  ← Update quantities, discounts
│  ├─ Calculate totals    │  ← Real-time calculations
│  └─ Validate stock      │
└────────┬────────────────┘
         │ 3. Checkout
         ▼
┌─────────────────────────┐
│    POSPayment UI        │
│  ├─ Select method       │  ← Cash, Card, M-Pesa, etc.
│  ├─ Enter tender        │  ← For cash payments
│  ├─ Add customer info   │  ← Optional
│  └─ Click "Complete"    │
└────────┬────────────────┘
         │ 4. Submit Sale
         ▼
┌─────────────────────────┐
│   POST /api/sales/      │
│      pos/sales          │  ← API Request
└────────┬────────────────┘
         │ 5. Backend Processing
         ▼
┌─────────────────────────────────────────┐
│         SalesService                    │
│  ┌────────────────────────────────────┐ │
│  │ 1. Generate Invoice Number         │ │
│  │    SequenceService.getNextNumber() │ │
│  │    Returns: "INV-0001"             │ │
│  ├────────────────────────────────────┤ │
│  │ 2. Begin Database Transaction      │ │
│  │    (Ensures atomicity)             │ │
│  ├────────────────────────────────────┤ │
│  │ 3. Create Sales Document           │ │
│  │    - Type: INVOICE                 │ │
│  │    - Status: PAID                  │ │
│  │    - Save totals                   │ │
│  ├────────────────────────────────────┤ │
│  │ 4. Create Document Items           │ │
│  │    - Link products                 │ │
│  │    - Save quantities/prices        │ │
│  ├────────────────────────────────────┤ │
│  │ 5. Record Payment                  │ │
│  │    - Link to document              │ │
│  │    - Save method/amount            │ │
│  ├────────────────────────────────────┤ │
│  │ 6. Create Inventory Transactions   │ │
│  │    - Type: SALE                    │ │
│  │    - Quantity: Negative (outbound) │ │
│  ├────────────────────────────────────┤ │
│  │ 7. Update Product Quantities       │ │
│  │    - Decrement stock               │ │
│  ├────────────────────────────────────┤ │
│  │ 8. Commit Transaction              │ │
│  │    (All or nothing)                │ │
│  └────────────────────────────────────┘ │
└─────────────┬───────────────────────────┘
              │ 6. Return Response
              ▼
┌─────────────────────────────┐
│   Response JSON             │
│  {                          │
│    success: true,           │
│    data: {                  │
│      id: "uuid",            │
│      invoice_no: "INV-0001",│
│      total: 220.40,         │
│      ...                    │
│    }                        │
│  }                          │
└──────────┬──────────────────┘
           │ 7. Show Success
           ▼
┌─────────────────────────────┐
│   POSSaleSuccess Modal      │
│  ├─ Show invoice number     │
│  ├─ Display receipt         │
│  ├─ Print button            │
│  └─ New sale button         │
└─────────────────────────────┘
```

## Security Architecture

```
┌──────────────────────────────────────────────────────┐
│              AUTHENTICATION FLOW                     │
└──────────────────────────────────────────────────────┘

1. User Login
   │
   ├─► POST /api/auth/login {email, password}
   │
   ├─► Backend validates credentials
   │
   ├─► Generate JWT token
   │   └─ Payload: {userId, branchId, role}
   │
   └─► Return token to frontend
       └─ Store in localStorage/context

2. API Requests
   │
   ├─► Add Authorization header
   │   └─ "Bearer {token}"
   │
   ├─► Backend: authenticate() middleware
   │   ├─ Verify JWT signature
   │   ├─ Check expiration
   │   └─ Extract user info
   │
   └─► Backend: authorize() middleware
       ├─ Check user role
       └─ Allow/Deny based on permissions

┌──────────────────────────────────────────────────────┐
│            ROLE-BASED PERMISSIONS                    │
└──────────────────────────────────────────────────────┘

ADMIN
├─ All POS operations
├─ View all sales
├─ Void documents
├─ Create credit notes
└─ Manage settings

MANAGER
├─ All POS operations
├─ View branch sales
├─ Void documents
├─ Create credit notes
└─ View reports

CASHIER
├─ Create POS sales
├─ View own sales
├─ Print receipts
└─ Basic operations
```

## Performance & Scalability

```
┌──────────────────────────────────────────────────────┐
│         PERFORMANCE OPTIMIZATIONS                    │
└──────────────────────────────────────────────────────┘

FRONTEND
├─ Debounced Search (300ms)
│  └─ Prevents excessive API calls
│
├─ Computed Values (useMemo)
│  └─ Subtotal, tax, total calculations
│
├─ Optimistic Updates
│  └─ Instant UI feedback
│
└─ Code Splitting
   └─ Lazy load components

BACKEND
├─ Database Indexes
│  ├─ sales_documents.documentId
│  ├─ sales_documents.branchId
│  ├─ sales_documents.createdAt
│  └─ inventory_transactions.productId
│
├─ Pagination
│  └─ Limit/offset for large datasets
│
├─ Transactions
│  └─ Atomic operations, rollback on error
│
└─ Connection Pooling
   └─ Prisma connection management

DATABASE
├─ Normalized Schema
│  └─ Minimize data duplication
│
├─ Foreign Keys
│  └─ Maintain referential integrity
│
└─ Proper Data Types
   └─ Decimal for money, UUID for IDs
```

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  PRODUCTION SETUP                       │
└─────────────────────────────────────────────────────────┘

┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│   Frontend   │      │   Backend    │      │  Database    │
│   (Vercel)   │◄────►│   (AWS EC2)  │◄────►│ (AWS RDS)    │
│   Next.js    │      │   Node.js    │      │ PostgreSQL   │
└──────────────┘      └──────────────┘      └──────────────┘
       │                      │                      │
       │                      │                      │
       └──────────┬───────────┴──────────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   Load Balancer │
         │   (AWS ALB)     │
         └─────────────────┘
                  │
                  ▼
         ┌─────────────────┐
         │   CDN/Cache     │
         │  (CloudFlare)   │
         └─────────────────┘
```

## Component Hierarchy

```
App (Next.js)
│
├─ Dashboard Layout
│  │
│  └─ POS Page (/dashboard/pos)
│     │
│     ├─ Header
│     │  ├─ Title
│     │  └─ POSQuickActions
│     │
│     ├─ Tabs
│     │  ├─ New Sale Tab
│     │  │  ├─ Left Column (2/3)
│     │  │  │  ├─ Search Card
│     │  │  │  │  └─ AutocompleteProductSearch
│     │  │  │  │
│     │  │  │  └─ Cart Card
│     │  │  │     └─ POSCart
│     │  │  │        ├─ Cart Table
│     │  │  │        ├─ Discount Dialog
│     │  │  │        └─ Action Buttons
│     │  │  │
│     │  │  └─ Right Column (1/3)
│     │  │     ├─ Payment Card
│     │  │     │  └─ POSPayment
│     │  │     │     ├─ Customer Form
│     │  │     │     ├─ Payment Methods
│     │  │     │     ├─ Order Summary
│     │  │     │     └─ Checkout Button
│     │  │     │
│     │  │     └─ Cashier Card
│     │  │        └─ POSCashier
│     │  │
│     │  ├─ History Tab
│     │  │  └─ POSHistory
│     │  │     ├─ Filters
│     │  │     ├─ Summary Cards
│     │  │     └─ Sales Table
│     │  │
│     │  └─ Reports Tab
│     │     └─ Coming Soon
│     │
│     └─ Modals
│        └─ POSSaleSuccess
│           ├─ Sale Summary
│           ├─ Receipt Preview
│           └─ Action Buttons
│
└─ API Calls (via fetch)
   └─ /api/sales/pos/sales
```

---

**Architecture Benefits**:
- ✅ Modular & Maintainable
- ✅ Scalable & Performant
- ✅ Secure & Validated
- ✅ Production-Ready
