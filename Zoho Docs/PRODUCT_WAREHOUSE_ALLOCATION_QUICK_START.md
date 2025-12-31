# Product Warehouse Allocation - Quick Start Guide

## What's New?

### 1. **Automatic Warehouse Allocation**
- When you create a product, it's now automatically allocated to the main warehouse
- Main warehouse = first warehouse created in the system (oldest by creation date)

### 2. **Optional Warehouse Selection**
- You can choose a different warehouse during product creation
- If no warehouse selected, defaults to main warehouse

### 3. **Stock Transfer Between Warehouses**
- Transfer inventory between any two warehouses
- Validates sufficient stock before transfer
- Atomic transactions ensure data consistency

---

## How to Use

### Creating a Product

#### Using the Frontend (Recommended)
1. Go to **Inventory → Add Product**
2. Fill in basic product details (SKU, Name, Prices)
3. Go to **Inventory** tab
4. **Optional**: Select a warehouse from the dropdown (leave empty for main warehouse)
5. Enter initial quantity
6. Click **Create Product**

#### Using the API
```bash
POST http://localhost:5000/products
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "sku": "PROD-001",
  "name": "Sample Product",
  "cost_price": 100,
  "unit_price": 150,
  "quantity": 50,
  "warehouseId": "optional_warehouse_id"  // Remove this line to use main warehouse
}
```

**Response:**
- Product created
- Inventory record automatically created in selected warehouse (or main warehouse)

---

### Transferring Stock Between Warehouses

#### Using the Frontend
1. Go to **Inventory** page
2. Find the product you want to transfer
3. Click **Transfer** button on the inventory row
4. Fill in the transfer form:
   - Select destination warehouse
   - Enter quantity to transfer
   - Provide a reason (required)
   - Add reference number (optional)
   - Add notes (optional)
5. Click **Transfer Stock**

#### Using the API
```bash
POST http://localhost:5000/inventory/transfer
Authorization: Bearer <your-token>
Content-Type: application/json

{
  "productId": "product_id_here",
  "fromWarehouseId": "source_warehouse_id",
  "toWarehouseId": "destination_warehouse_id",
  "quantity": 10,
  "reason": "Stock rebalancing",
  "reference": "TRANS-001",
  "notes": "Moving excess stock from branch A to branch B"
}
```

**Response:**
```json
{
  "productId": "...",
  "fromWarehouseId": "...",
  "toWarehouseId": "...",
  "quantity": 10,
  "fromWarehouseBefore": { "quantity": 100, "available": 95 },
  "fromWarehouseAfter": { "quantity": 90, "available": 85 },
  "toWarehouseBefore": { "quantity": 20, "available": 20 },
  "toWarehouseAfter": { "quantity": 30, "available": 30 },
  "timestamp": "2025-12-01T19:00:00.000Z"
}
```

---

## Files Modified

### Backend
- ✅ `backend/src/modules/products/services/product.service.ts`
  - Added warehouse allocation logic
  - Creates inventory record on product creation
  - Uses transactions for consistency

### Frontend
- ✅ `frontend/app/dashboard/inventory/components/add-product-dialog.tsx`
  - Added warehouse selection field
  - Sends warehouseId in product creation request

### New Files Created
- ✅ `frontend/components/ui/warehouse-select.tsx`
  - Reusable warehouse selection component
  - Loads all active warehouses
  
- ✅ `frontend/app/dashboard/inventory/components/transfer-stock-dialog.tsx`
  - Complete stock transfer form
  - Validation and error handling
  
- ✅ `PRODUCT_WAREHOUSE_ALLOCATION_GUIDE.md`
  - Comprehensive implementation guide
  
- ✅ `PRODUCT_WAREHOUSE_ALLOCATION_QUICK_START.md`
  - This quick start guide

---

## Common Scenarios

### Scenario 1: New Product with Default Settings
```json
POST /products
{
  "sku": "DESK-001",
  "name": "Office Desk",
  "cost_price": 5000,
  "unit_price": 7500,
  "quantity": 20
}
```
→ Product allocated to main warehouse with 20 units

### Scenario 2: New Product for Specific Branch
```json
POST /products
{
  "sku": "CHAIR-001",
  "name": "Office Chair",
  "cost_price": 2000,
  "unit_price": 3500,
  "quantity": 50,
  "warehouseId": "warehouse_branch_b_id"
}
```
→ Product allocated to Branch B warehouse with 50 units

### Scenario 3: Transfer Stock Between Branches
```json
POST /inventory/transfer
{
  "productId": "desk_001_id",
  "fromWarehouseId": "main_warehouse_id",
  "toWarehouseId": "branch_b_warehouse_id",
  "quantity": 5,
  "reason": "Branch B needs more stock"
}
```
→ 5 units moved from main warehouse to Branch B

---

## Validation Rules

### Product Creation
- ✅ SKU must be unique
- ✅ UPC must be unique (if provided)
- ✅ Cost price and unit price must be > 0
- ✅ Warehouse must exist and be active (if specified)
- ✅ If no warehouse specified, system must have at least one active warehouse

### Stock Transfer
- ✅ Source and destination warehouses must be different
- ✅ Quantity must be > 0
- ✅ Quantity must not exceed available stock
- ✅ Product must exist in source warehouse
- ✅ Reason must be provided
- ✅ Both warehouses must exist and be active

---

## Inventory Status

The system automatically calculates inventory status:

| Condition | Status |
|-----------|--------|
| Quantity = 0 | `out_of_stock` |
| Quantity < Reorder Level | `low_stock` |
| Quantity ≥ Reorder Level | `in_stock` |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/products` | Create product (auto-allocates to warehouse) |
| GET | `/products` | List all products |
| GET | `/products/:id` | Get product with inventory details |
| POST | `/inventory/transfer` | Transfer stock between warehouses |
| GET | `/inventory` | View all inventory records |
| GET | `/warehouses` | List all warehouses |

---

## Troubleshooting

### Error: "No active warehouse found"
**Solution**: Create at least one warehouse before creating products
```bash
POST /warehouses
{
  "code": "WH-MAIN",
  "name": "Main Warehouse",
  "location": "Nairobi",
  "capacity": 10000,
  "branchId": "your_branch_id"
}
```

### Error: "Insufficient inventory in source warehouse"
**Solution**: Check available quantity before transfer. Available = Total - Reserved

### Error: "Source and destination warehouses must be different"
**Solution**: Select different warehouses for transfer

### Transfer Not Showing in Frontend
**Solution**: Make sure to refresh the inventory list after transfer. The dialog calls `onTransferComplete()` callback to trigger refresh.

---

## Next Steps

1. **Test Product Creation**
   - Create a product without specifying warehouse
   - Verify it appears in the main warehouse

2. **Test Warehouse Selection**
   - Create a product with specific warehouse
   - Check it's allocated correctly

3. **Test Stock Transfer**
   - Create a product with some quantity
   - Transfer part of the stock to another warehouse
   - Verify quantities updated in both warehouses

4. **Verify Inventory Status**
   - Create product with quantity below reorder level
   - Check status shows as "low_stock"

---

## Need Help?

- Check logs: `backend/logs/` for detailed error messages
- Review database: Check `products` and `inventory` tables
- API testing: Use Postman or curl for direct API testing
- See comprehensive guide: `PRODUCT_WAREHOUSE_ALLOCATION_GUIDE.md`
