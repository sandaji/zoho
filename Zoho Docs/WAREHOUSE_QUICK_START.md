# Warehouse Module - Quick Start

## Setup (5 minutes)

### 1. Run Database Migration
```bash
cd backend
npx prisma migrate dev --name add_warehouse_management
npx prisma generate
```

### 2. Restart Backend
```bash
# Backend should auto-restart if using nodemon
# Or restart manually
npm run dev
```

### 3. Access Warehouse Module
Navigate to: `http://localhost:3000/dashboard/warehouse`

## What's Included

✅ **Backend API** - 8 endpoints for warehouse management  
✅ **Stock Transfers** - Move inventory between warehouses  
✅ **Stock Adjustments** - Increase/decrease inventory  
✅ **Movement History** - Complete audit trail  
✅ **Transaction Safety** - All operations use database transactions  
✅ **Frontend Dashboard** - 3 pages with full UI  

## Quick Test

### 1. View Warehouse Dashboard
```
URL: /dashboard/warehouse
Shows: KPIs, recent movements, quick actions
```

### 2. Create a Stock Transfer
```
1. Go to: /dashboard/warehouse/transfers
2. Click "New Transfer"
3. Select source and target warehouses
4. Add products and quantities
5. Click "Create Transfer"
```

### 3. Receive the Transfer
```
1. Find your transfer in the list
2. Click "Receive Transfer"
3. Stock automatically moves from source to target
```

### 4. Adjust Stock
```
1. Go to: /dashboard/warehouse/inventory
2. Find a product
3. Click "Adjust"
4. Enter quantity (positive or negative)
5. Provide reason
6. Confirm
```

## API Endpoints

```
POST   /v1/warehouse/transfer          Create transfer
POST   /v1/warehouse/transfer/:id/receive  Receive transfer
POST   /v1/warehouse/adjust            Adjust stock
GET    /v1/warehouse/transfers         List transfers
GET    /v1/warehouse/movements         List movements
GET    /v1/warehouse/stats             Get statistics
```

## File Structure

```
backend/src/modules/warehouse/
├── warehouse.schema.ts      ✅ Created
├── warehouse.service.ts     ✅ Created
├── warehouse.controller.ts  ✅ Created
└── warehouse.routes.ts      ✅ Created

frontend/app/dashboard/warehouse/
├── page.tsx                 ✅ Created (Overview)
├── inventory/page.tsx       ✅ Created
└── transfers/page.tsx       ✅ Created

frontend/lib/
└── warehouse.service.ts     ✅ Created (API client)
```

## Database Tables Created

- ✅ `stock_movements` - Movement audit trail
- ✅ `stock_transfers` - Transfer records
- ✅ `transfer_items` - Transfer line items

## Permissions

| Action | Role Required |
|--------|---------------|
| View | All authenticated users |
| Create Transfer | Manager, Branch Manager, Admin |
| Receive Transfer | Manager, Branch Manager, Admin |
| Adjust Stock | Manager, Branch Manager, Admin |

## Common Operations

### Transfer Stock
```typescript
// Frontend
await warehouseService.createTransfer({
  sourceId: "warehouse-1",
  targetId: "warehouse-2",
  items: [
    { productId: "product-1", quantity: 50 }
  ],
  notes: "Monthly restock"
}, token);
```

### Adjust Stock
```typescript
// Frontend
await warehouseService.adjustStock({
  warehouseId: "warehouse-1",
  productId: "product-1",
  quantity: -5, // negative = decrease
  reason: "Damaged goods"
}, token);
```

### View Movements
```typescript
// Frontend
await warehouseService.getStockMovements({
  warehouseId: "warehouse-1",
  type: "ADJUSTMENT",
  page: 1,
  limit: 50
}, token);
```

## Testing

### Test Scenario 1: Create and Fulfill Transfer
```
1. ✅ Create transfer from WH1 to WH2
2. ✅ Verify transfer appears in pending list
3. ✅ Receive transfer
4. ✅ Check inventory in both warehouses
5. ✅ Verify movement logs created
```

### Test Scenario 2: Stock Adjustment
```
1. ✅ Check current stock level
2. ✅ Create adjustment (increase by 10)
3. ✅ Verify new stock level
4. ✅ Check movement log created
5. ✅ Create adjustment (decrease by 5)
6. ✅ Verify stock decreased
```

### Test Scenario 3: Error Handling
```
1. ✅ Try to transfer more than available (should fail)
2. ✅ Try to transfer to same warehouse (should fail)
3. ✅ Try to receive completed transfer (should fail)
4. ✅ Try to adjust beyond available stock (should fail)
```

## Troubleshooting

### "Failed to load warehouse data"
**Fix**: Check backend is running on port 5000

### "Insufficient stock" error
**Fix**: Check available quantity (not just total quantity)

### Transfers not showing
**Fix**: Check status filter - pending transfers won't show in "Completed" filter

### Can't adjust stock
**Fix**: Verify you have manager role

## Next Steps

1. ✅ Test all endpoints
2. ✅ Add real warehouses to your database
3. ✅ Add products with inventory
4. ✅ Create test transfers
5. ✅ Train users on the interface

## Support

- Check: [Complete Guide](./WAREHOUSE_MODULE_GUIDE.md)
- Backend logs: Check console for errors
- Frontend errors: Check browser console
- Database: Verify migrations ran successfully

That's it! Your warehouse module is ready to use! 🎉
