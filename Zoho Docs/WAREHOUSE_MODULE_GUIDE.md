# Warehouse Management Module - Complete Implementation Guide

## Overview
Complete warehouse management module with stock transfers, adjustments, and movement tracking.

## Backend Implementation

### Files Created
```
backend/src/modules/warehouse/
├── warehouse.schema.ts      - Zod validation schemas
├── warehouse.service.ts     - Business logic
├── warehouse.controller.ts  - HTTP request handlers
└── warehouse.routes.ts      - API routes
```

### API Endpoints

#### Stock Transfers
- `POST /v1/warehouse/transfer` - Create new transfer
- `GET /v1/warehouse/transfers` - List all transfers (with filtering)
- `GET /v1/warehouse/transfers/:id` - Get single transfer
- `PATCH /v1/warehouse/transfers/:id/status` - Update status (IN_TRANSIT/CANCELLED)
- `POST /v1/warehouse/transfer/:id/receive` - Fulfill/receive transfer

#### Stock Adjustments
- `POST /v1/warehouse/adjust` - Adjust stock (+ or -)

#### Stock Movements
- `GET /v1/warehouse/movements` - Get movement history

#### Statistics
- `GET /v1/warehouse/stats` - Get warehouse statistics

### Database Schema
Models already exist in schema.prisma:
- `StockMovement` - Audit trail for all inventory changes
- `StockTransfer` - Transfer records between warehouses
- `TransferItem` - Line items in transfers

### Running Migration

```bash
cd backend
npx prisma migrate dev --name add_warehouse_management
npx prisma generate
```

## Frontend Implementation

### Files Created
```
frontend/app/dashboard/warehouse/
├── page.tsx                     - Overview dashboard
├── inventory/page.tsx           - Inventory management
└── transfers/page.tsx           - Transfer management

frontend/lib/
└── warehouse.service.ts         - API service
```

### Features

#### 1. Overview Dashboard (`/dashboard/warehouse`)
- **KPI Cards**:
  - Total Products
  - Total Stock Value
  - Low Stock Items
  - Out of Stock Items
- **Recent Movements Table**
- **Quick Action Cards**

#### 2. Inventory Management (`/dashboard/warehouse/inventory`)
- **Product List** with stock levels
- **Warehouse Filter**
- **Search Functionality**
- **Stock Adjustment Dialog**:
  - Increase/decrease stock
  - Requires reason
  - Real-time updates

#### 3. Transfer Management (`/dashboard/warehouse/transfers`)
- **Transfer List** with status filtering
- **Create Transfer Dialog**:
  - Select source/target warehouses
  - Add multiple items
  - Product search
  - Notes field
- **Receive Transfer** button for incoming transfers
- **Status Badges** (PENDING, IN_TRANSIT, COMPLETED, CANCELLED)

## Usage Examples

### 1. Create Stock Transfer

**Request:**
```typescript
POST /v1/warehouse/transfer
Authorization: Bearer <token>

{
  "sourceId": "warehouse-1",
  "targetId": "warehouse-2",
  "items": [
    { "productId": "product-1", "quantity": 50 },
    { "productId": "product-2", "quantity": 30 }
  ],
  "notes": "Monthly restock",
  "driverId": "driver-1" // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "transfer-123",
    "transferNo": "TRF-1234567890-ABC123",
    "status": "PENDING",
    "sourceWarehouse": { ... },
    "targetWarehouse": { ... },
    "items": [ ... ]
  },
  "message": "Transfer created successfully"
}
```

### 2. Fulfill Transfer

**Request:**
```typescript
POST /v1/warehouse/transfer/:id/receive
Authorization: Bearer <token>
```

**What happens:**
1. Verifies transfer status
2. Checks stock availability
3. **Transaction BEGIN**
4. Deducts from source warehouse
5. Adds to target warehouse
6. Creates TRANSFER_OUT movement log
7. Creates TRANSFER_IN movement log
8. Updates product total quantity
9. Sets transfer status to COMPLETED
10. **Transaction COMMIT**

### 3. Adjust Stock

**Request:**
```typescript
POST /v1/warehouse/adjust
Authorization: Bearer <token>

{
  "warehouseId": "warehouse-1",
  "productId": "product-1",
  "quantity": -5, // negative = decrease, positive = increase
  "reason": "Damaged goods during inspection"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "movement": { ... },
    "inventory": { ... },
    "adjustmentType": "decrease"
  }
}
```

## Error Handling

### Common Errors

#### 1. Insufficient Stock
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Insufficient stock for product Laptop (SKU: LAP001). Available: 10, Requested: 50"
  }
}
```

**Frontend Handling:**
```typescript
try {
  await warehouseService.createTransfer(data, token);
  toast.success("Transfer created");
} catch (error: any) {
  if (error.message.includes("Insufficient stock")) {
    toast.error("Not enough stock available");
  } else {
    toast.error("Failed to create transfer");
  }
}
```

#### 2. Same Source/Target
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Source and target warehouses must be different"
  }
}
```

#### 3. Invalid Transfer Status
```json
{
  "success": false,
  "error": {
    "message": "Cannot fulfill transfer with status: COMPLETED"
  }
}
```

## Security & Permissions

### Required Permissions
- **Create Transfer**: `managerAccess` (admin, manager, branch_manager)
- **Fulfill Transfer**: `managerAccess`
- **Adjust Stock**: `managerAccess`
- **View Transfers**: `authMiddleware` (all authenticated users)
- **View Movements**: `authMiddleware`
- **View Stats**: `authMiddleware`

### Middleware Chain
```typescript
router.post(
  "/transfer",
  authMiddleware,      // Verify user is logged in
  managerAccess,       // Verify user has manager role
  controller.create
);
```

## Testing Checklist

### Backend Tests
- [ ] Create transfer with valid data
- [ ] Create transfer with insufficient stock (should fail)
- [ ] Create transfer with same source/target (should fail)
- [ ] Fulfill pending transfer
- [ ] Fulfill already completed transfer (should fail)
- [ ] Adjust stock (positive)
- [ ] Adjust stock (negative with insufficient stock - should fail)
- [ ] Get movements with filters
- [ ] Get transfers with status filter
- [ ] Update transfer status to IN_TRANSIT
- [ ] Cancel transfer

### Frontend Tests
- [ ] Load warehouse dashboard
- [ ] View inventory list
- [ ] Filter inventory by warehouse
- [ ] Search products
- [ ] Adjust stock (increase)
- [ ] Adjust stock (decrease)
- [ ] Create new transfer
- [ ] Add multiple items to transfer
- [ ] Remove item from transfer
- [ ] Submit transfer
- [ ] Receive pending transfer
- [ ] Filter transfers by status
- [ ] View transfer details

## Database Transactions

All inventory operations use Prisma transactions to ensure data consistency:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Update source inventory
  await tx.inventory.update({ ... });
  
  // 2. Update target inventory
  await tx.inventory.update({ ... });
  
  // 3. Create movement logs
  await tx.stockMovement.create({ ... });
  
  // 4. Update transfer status
  await tx.stockTransfer.update({ ... });
  
  // 5. Update product quantities
  await tx.product.update({ ... });
});
```

## Performance Considerations

1. **Batch Operations**: Create transfer with multiple items in single transaction
2. **Indexing**: Database indexes on frequently queried fields
3. **Pagination**: All list endpoints support pagination
4. **Caching**: Consider caching warehouse/product lists
5. **Lazy Loading**: Load transfer items on-demand

## Future Enhancements

1. **Barcode Scanning** - Scan products during transfer
2. **Transfer Templates** - Save frequent transfer configurations
3. **Automated Transfers** - Based on stock levels
4. **Transfer Approval Workflow** - Multi-step approval process
5. **QR Codes** - Generate QR codes for transfers
6. **Driver Assignment** - Assign and track drivers
7. **Photo Documentation** - Attach photos to movements
8. **Batch Adjustments** - Adjust multiple products at once
9. **Stock Alerts** - Email/SMS notifications for low stock
10. **Warehouse Capacity** - Track and enforce capacity limits

## Troubleshooting

### Issue: Transfer not appearing in list
**Solution**: Check filters and status. Pending transfers show in "PENDING" filter.

### Issue: "Insufficient Stock" error
**Solution**: 
1. Check available quantity (not reserved)
2. Verify correct warehouse selected
3. Check for pending transfers

### Issue: Can't receive transfer
**Solution**: Verify transfer status is PENDING or IN_TRANSIT

### Issue: Stock adjustment not reflecting
**Solution**: 
1. Check warehouse filter on inventory page
2. Verify adjustment was successful (check movements)
3. Refresh page

## Support

For issues or questions:
1. Check error messages in browser console
2. Verify API responses in Network tab
3. Check backend logs for detailed errors
4. Ensure migrations are up to date
5. Verify user has required permissions
