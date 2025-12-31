# Inventory Issue Fix - Complete Guide

## Problem
When completing a sale in POS, getting error:
```
Insufficient inventory for product: DIGITAL TIMER in branch Westlands Branch
```

This is **CORRECT BEHAVIOR** - the system is preventing overselling. However, the product exists but lacks inventory in the Westlands Branch warehouse.

## Root Cause
The product "DIGITAL TIMER" exists in your database but either:
1. Has no inventory record for Westlands warehouse
2. Has zero available quantity in Westlands warehouse

## Solution Options

### Option 1: Run the Fix Script (RECOMMENDED)

I've created a script to automatically add inventory for all products to Westlands Branch.

**Steps:**
```bash
cd backend

# Run the fix script
npx tsx fix-inventory.ts
```

This will:
- Find all products missing inventory in Westlands
- Add 40% of total product quantity to Westlands warehouse
- Update products with zero inventory

### Option 2: Re-seed the Database

If you want to start fresh with clean data:

```bash
cd backend

# Reset and re-seed database
npm run seed
# or
npx tsx prisma/seed.ts
```

This will:
- Clear all existing data
- Create branches, warehouses, users
- Create products with proper inventory distribution
- 60% inventory goes to Main Warehouse
- 40% inventory goes to Westlands Branch

### Option 3: Check Which Products Have Inventory

Run the SQL query to see available products:

```bash
# In your PostgreSQL client (pgAdmin, psql, etc.)
# Run the query in: backend/check_inventory.sql
```

Or use Prisma Studio:
```bash
cd backend
npx prisma studio
```

Then:
1. Open "inventory" table
2. Filter by warehouse (Westlands)
3. Check "available" column > 0

### Option 4: Manual Fix via Prisma Studio

```bash
cd backend
npx prisma studio
```

Then:
1. Go to "products" table - note the product ID for DIGITAL TIMER
2. Go to "warehouses" table - note the Westlands warehouse ID
3. Go to "inventory" table
4. Add new record:
   - productId: (from step 1)
   - warehouseId: (from step 2)
   - quantity: 50 (or any number)
   - available: 50
   - reserved: 0
   - status: "in_stock"

## Frontend Improvements Made

Updated error handling in `frontend/app/dashboard/pos/page.tsx`:

**Before:**
```typescript
if (!res.ok) {
  const msg = await res.text();
  throw new Error(msg || "Checkout failed");
}
```

**After:**
```typescript
const json: SalesResponse = await res.json();

if (!res.ok || !json.success) {
  // Show the actual error message from backend
  const errorMessage = json.message || "Checkout failed";
  toast(errorMessage, "error");
  return;
}
```

Now you'll see the exact error message in a toast notification instead of just "Checkout failed".

## How to Test Products with Inventory

### If you re-seeded with the original seed file:

Try searching for these products (from seed.ts):
- **LAP-001** - Dell Latitude 5420
- **LAP-002** - HP Elitebook 840
- **DSK-001** - Dell OptiPlex 7090
- **MNT-001** - Dell UltraSharp 24
- **KB-001** - Logitech MX Keys
- **MS-001** - Logitech MX Master 3

All these should have inventory in Westlands Branch (40% of total quantity).

### Check inventory before adding to cart:

When you search for a product, the backend returns the `available` quantity:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "Dell Latitude 5420",
    "available": 24  // ← This shows available inventory
  }
}
```

## Understanding Inventory Logic

The POS system follows this flow:

1. **Product Search** - Shows `available` quantity for the current branch
2. **Add to Cart** - Frontend checks if quantity > available
3. **Complete Sale** - Backend verifies inventory again and:
   - Finds inventory in branch warehouse with enough stock
   - Reduces `available` and `quantity` by sold amount
   - Updates status to `low_stock` or `out_of_stock` if needed
   - Updates product's total quantity

## Files Created

1. **backend/fix-inventory.ts** - Script to add missing inventory
2. **backend/check_inventory.sql** - SQL query to check inventory
3. **INVENTORY_FIX_GUIDE.md** - This guide

## Files Modified

1. **frontend/app/dashboard/pos/page.tsx** - Better error handling

## Quick Reference Commands

```bash
# Check inventory in Prisma Studio
cd backend && npx prisma studio

# Run inventory fix script
cd backend && npx tsx fix-inventory.ts

# Re-seed database
cd backend && npm run seed

# Check what products exist
cd backend
npx prisma studio
# Open "products" table and note SKU values
```

## Error Messages Explained

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "Product not found: X" | Product doesn't exist | Check SKU/barcode |
| "Insufficient inventory for product: X in branch Y" | No stock in this branch's warehouse | Run fix-inventory.ts or re-seed |
| "Insufficient inventory" (in cart) | Trying to add more than available | Reduce quantity |

## Prevention

To avoid this issue in the future:

1. **Always create inventory records** when creating products
2. **Distribute inventory** across warehouses (not just one)
3. **Use the fix script** after importing products
4. **Check available quantity** before adding to cart

## Recommended Flow

### For Development:
```bash
# Start fresh
cd backend
npm run seed
# Now all products have inventory in both warehouses
```

### For Production:
1. When adding new products, also create inventory records for each warehouse
2. Set appropriate quantities based on actual stock
3. Regularly audit inventory with Prisma Studio

## Next Steps

1. **Run the fix script**: `cd backend && npx tsx fix-inventory.ts`
2. **Try the sale again** with products that now have inventory
3. **Verify in Prisma Studio** that inventory was created
4. **Test with different products** to confirm all work

## Support

If you still see the error after running the fix script:

1. Check the console output from fix-inventory.ts
2. Verify in Prisma Studio that inventory records exist
3. Check the "available" column is > 0
4. Ensure the warehouseId matches Westlands warehouse
5. Try logging out and logging back in

---

**The error message is actually helpful** - it prevents overselling! Once you add inventory, the system will work perfectly. 🎉
