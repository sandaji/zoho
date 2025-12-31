# Warehouse Module Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐│
│  │ Warehouse        │  │ Inventory        │  │ Transfers     ││
│  │ Dashboard        │  │ Management       │  │ Management    ││
│  │ /warehouse       │  │ /inventory       │  │ /transfers    ││
│  └────────┬─────────┘  └────────┬─────────┘  └───────┬───────┘│
│           │                     │                     │        │
│           └─────────────────────┴─────────────────────┘        │
│                                 │                               │
│                    ┌────────────▼──────────────┐               │
│                    │ warehouse.service.ts      │               │
│                    │ (API Client)              │               │
│                    └────────────┬──────────────┘               │
└─────────────────────────────────┼────────────────────────────────┘
                                  │ HTTP Requests
                                  │ (Bearer Token)
┌─────────────────────────────────▼────────────────────────────────┐
│                         BACKEND API                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Route: /v1/warehouse/*                                     ││
│  │ ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  ││
│  │ │authMiddleware│→│roleMiddleware│→│ Controller       │  ││
│  │ └─────────────┘  └──────────────┘  └─────────┬────────┘  ││
│  └─────────────────────────────────────────────────┼──────────┘│
│                                                     │           │
│  ┌──────────────────────────────────────────────────▼─────────┐│
│  │ warehouse.service.ts (Business Logic)                      ││
│  │                                                            ││
│  │ • createTransfer()                                         ││
│  │ • fulfillTransfer() [TRANSACTION]                         ││
│  │ • adjustStock() [TRANSACTION]                             ││
│  │ • getStockMovements()                                     ││
│  │ • getTransfers()                                          ││
│  │ • getWarehouseStats()                                     ││
│  └──────────────────────────────┬─────────────────────────────┘│
│                                  │                              │
└──────────────────────────────────┼───────────────────────────────┘
                                   │ Prisma Client
┌──────────────────────────────────▼───────────────────────────────┐
│                         DATABASE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ stock_transfers│  │ transfer_items│  │ stock_movements  │   │
│  ├────────────────┤  ├──────────────┤  ├──────────────────┤   │
│  │ id             │  │ id           │  │ id               │   │
│  │ transferNo     │  │ transferId   │  │ type             │   │
│  │ status         │  │ productId    │  │ quantity         │   │
│  │ sourceId    ◄──┼──┼ quantity     │  │ productId        │   │
│  │ targetId       │  └──────────────┘  │ warehouseId      │   │
│  │ createdById    │                    │ reference        │   │
│  └────────────────┘                    └──────────────────┘   │
│                                                                  │
│  ┌────────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ warehouses     │  │ inventory    │  │ products         │   │
│  ├────────────────┤  ├──────────────┤  ├──────────────────┤   │
│  │ id             │  │ id           │  │ id               │   │
│  │ code           │  │ productId    │  │ sku              │   │
│  │ name           │  │ warehouseId  │  │ name             │   │
│  │ branchId       │  │ quantity     │  │ quantity (total) │   │
│  └────────────────┘  │ available    │  │ reorder_level    │   │
│                      │ reserved     │  └──────────────────┘   │
│                      └──────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

## Transfer Flow Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                     STOCK TRANSFER FLOW                           │
└───────────────────────────────────────────────────────────────────┘

1. CREATE TRANSFER (Status: PENDING)
   ┌─────────────────────────────────────┐
   │ User creates transfer via UI        │
   │ • Select source warehouse           │
   │ • Select target warehouse           │
   │ • Add products & quantities         │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ Backend validates:                  │
   │ ✓ Warehouses exist                  │
   │ ✓ Products exist                    │
   │ ✓ Sufficient stock available        │
   │ ✓ Source ≠ Target                   │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ Create records:                     │
   │ • StockTransfer (PENDING)           │
   │ • TransferItems (multiple)          │
   │ • Generate unique transferNo        │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ Transfer created successfully       │
   │ Status: PENDING                     │
   │ Awaiting fulfillment                │
   └─────────────────────────────────────┘

2. FULFILL TRANSFER (Status: PENDING → COMPLETED)
   ┌─────────────────────────────────────┐
   │ User clicks "Receive Transfer"      │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ Backend validates:                  │
   │ ✓ Transfer exists                   │
   │ ✓ Status is PENDING/IN_TRANSIT      │
   │ ✓ Stock still available             │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ BEGIN TRANSACTION                   │
   │ ────────────────────────────────    │
   │ For each item:                      │
   │                                     │
   │ 1. Deduct from source inventory     │
   │    UPDATE inventory SET             │
   │      quantity = quantity - X        │
   │      available = available - X      │
   │                                     │
   │ 2. Create TRANSFER_OUT movement     │
   │    INSERT INTO stock_movements      │
   │                                     │
   │ 3. Add to target inventory          │
   │    UPDATE/INSERT inventory SET      │
   │      quantity = quantity + X        │
   │      available = available + X      │
   │                                     │
   │ 4. Create TRANSFER_IN movement      │
   │    INSERT INTO stock_movements      │
   │                                     │
   │ 5. Update product total             │
   │    UPDATE products SET quantity     │
   │                                     │
   │ 6. Update transfer status           │
   │    UPDATE stock_transfers SET       │
   │      status = 'COMPLETED'           │
   │                                     │
   │ COMMIT TRANSACTION                  │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ Transfer completed successfully     │
   │ Status: COMPLETED                   │
   │ Stock moved & logged                │
   └─────────────────────────────────────┘
```

## Stock Adjustment Flow

```
┌───────────────────────────────────────────────────────────────────┐
│                    STOCK ADJUSTMENT FLOW                          │
└───────────────────────────────────────────────────────────────────┘

   ┌─────────────────────────────────────┐
   │ User initiates adjustment           │
   │ • Select warehouse                  │
   │ • Select product                    │
   │ • Enter quantity (+/-)              │
   │ • Provide reason                    │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ Backend validates:                  │
   │ ✓ Warehouse exists                  │
   │ ✓ Product exists                    │
   │ ✓ Quantity ≠ 0                      │
   │ ✓ If negative: sufficient stock     │
   │ ✓ Reason provided                   │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ BEGIN TRANSACTION                   │
   │ ────────────────────────────────    │
   │                                     │
   │ 1. Update inventory                 │
   │    UPDATE/INSERT inventory SET      │
   │      quantity = quantity + X        │
   │      available = available + X      │
   │                                     │
   │ 2. Create ADJUSTMENT movement       │
   │    INSERT INTO stock_movements      │
   │      type = 'ADJUSTMENT'            │
   │      quantity = abs(X)              │
   │      reference = reason             │
   │                                     │
   │ 3. Update product total             │
   │    UPDATE products SET              │
   │      quantity = SUM(inventory.qty)  │
   │                                     │
   │ COMMIT TRANSACTION                  │
   └──────────────┬──────────────────────┘
                  │
                  ▼
   ┌─────────────────────────────────────┐
   │ Adjustment completed successfully   │
   │ Inventory updated & logged          │
   └─────────────────────────────────────┘
```

## Component Hierarchy

```
Warehouse Module
│
├── Backend
│   ├── warehouse.schema.ts (Validation)
│   │   ├── createTransferSchema
│   │   ├── adjustStockSchema
│   │   ├── getStockMovementsSchema
│   │   └── getTransfersSchema
│   │
│   ├── warehouse.service.ts (Business Logic)
│   │   ├── createTransfer()
│   │   ├── fulfillTransfer() [TX]
│   │   ├── adjustStock() [TX]
│   │   ├── getStockMovements()
│   │   ├── getTransfers()
│   │   └── getWarehouseStats()
│   │
│   ├── warehouse.controller.ts (HTTP Handlers)
│   │   ├── createTransfer()
│   │   ├── fulfillTransfer()
│   │   ├── adjustStock()
│   │   ├── getStockMovements()
│   │   ├── getTransfers()
│   │   └── getWarehouseStats()
│   │
│   └── warehouse.routes.ts (Route Definitions)
│       ├── POST /transfer
│       ├── POST /transfer/:id/receive
│       ├── POST /adjust
│       ├── GET /transfers
│       ├── GET /movements
│       └── GET /stats
│
└── Frontend
    ├── lib/warehouse.service.ts (API Client)
    │   ├── createTransfer()
    │   ├── fulfillTransfer()
    │   ├── adjustStock()
    │   ├── getStockMovements()
    │   ├── getTransfers()
    │   └── getWarehouseStats()
    │
    └── app/dashboard/warehouse/
        ├── page.tsx (Overview)
        │   ├── KPI Cards
        │   ├── Recent Movements
        │   └── Quick Actions
        │
        ├── inventory/page.tsx (Inventory)
        │   ├── Product List
        │   ├── Warehouse Filter
        │   ├── Search
        │   └── Adjustment Dialog
        │
        └── transfers/page.tsx (Transfers)
            ├── Transfer List
            ├── Status Filters
            ├── New Transfer Dialog
            └── Receive Button
```

## Data Flow Example

```
User Action: Create Transfer
│
├─► Frontend: transfers/page.tsx
│   ├─► Validate form inputs
│   └─► Call warehouse.service.createTransfer()
│
├─► Frontend: warehouse.service.ts
│   ├─► Prepare HTTP request
│   ├─► Add Bearer token
│   └─► POST to /v1/warehouse/transfer
│
├─► Backend: warehouse.routes.ts
│   ├─► authMiddleware (verify token)
│   ├─► managerAccess (check role)
│   └─► warehouse.controller.createTransfer()
│
├─► Backend: warehouse.controller.ts
│   ├─► Extract user ID from token
│   ├─► Validate request body with Zod
│   └─► Call warehouse.service.createTransfer()
│
├─► Backend: warehouse.service.ts
│   ├─► Verify warehouses exist
│   ├─► Verify products exist
│   ├─► Check stock availability
│   ├─► Generate unique transferNo
│   ├─► Create StockTransfer record
│   ├─► Create TransferItem records
│   └─► Return transfer data
│
├─► Backend: Prisma Client
│   ├─► Execute SQL queries
│   └─► Return results
│
├─► Backend: PostgreSQL Database
│   ├─► Insert into stock_transfers
│   ├─► Insert into transfer_items
│   └─► Commit transaction
│
└─► Response flows back through layers
    ├─► Service → Controller → Route → HTTP Response
    ├─► Frontend receives success
    ├─► Show toast notification
    ├─► Refresh transfer list
    └─► Close dialog
```

This architecture ensures:
- ✅ Clear separation of concerns
- ✅ Type safety throughout
- ✅ Transaction-based operations
- ✅ Proper error handling
- ✅ Authentication & authorization
- ✅ Audit trail for all changes
