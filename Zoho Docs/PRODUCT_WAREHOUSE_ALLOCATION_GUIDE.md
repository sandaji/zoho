# Product Creation and Stock Transfer Implementation

## Overview
This implementation adds the following features:
1. **Automatic Warehouse Allocation**: When creating a product, it's automatically allocated to the main warehouse (or a selected warehouse)
2. **Warehouse Selection**: Option to choose a different warehouse during product creation
3. **Stock Transfer**: Ability to transfer inventory between warehouses through the inventory module

## Backend Changes

### 1. Product Service (`backend/src/modules/products/services/product.service.ts`)

#### Key Changes:
- Added `warehouseId` optional parameter to `CreateProductDTO`
- Implemented `getMainWarehouse()` method to fetch the first active warehouse
- Modified `createProduct()` to:
  - Automatically allocate products to main warehouse if no warehouse specified
  - Create inventory record in the selected warehouse
  - Set proper inventory status based on quantity and reorder level
  - Use transaction to ensure both product and inventory are created atomically

#### New Method: `getMainWarehouse()`
```typescript
private async getMainWarehouse() {
  const mainWarehouse = await prisma.warehouse.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (!mainWarehouse) {
    throw new AppError(
      ErrorCode.NOT_FOUND,
      404,
      "No active warehouse found. Please create a warehouse first."
    );
  }

  return mainWarehouse;
}
```

#### Updated: `createProduct()`
- Now accepts optional `warehouseId` in data
- Creates inventory record automatically
- Uses transaction for data consistency

### 2. Inventory Service (Already Implemented)

The inventory service already has the `transferInventory` method which handles stock transfers between warehouses.

#### Transfer Endpoint: `POST /inventory/transfer`

**Request Body:**
```json
{
  "productId": "product_id_here",
  "fromWarehouseId": "source_warehouse_id",
  "toWarehouseId": "destination_warehouse_id",
  "quantity": 10,
  "reason": "Stock rebalancing",
  "reference": "TRANS-001",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "productId": "product_id_here",
  "fromWarehouseId": "source_warehouse_id",
  "toWarehouseId": "destination_warehouse_id",
  "quantity": 10,
  "reason": "Stock rebalancing",
  "fromWarehouseBefore": {
    "quantity": 100,
    "available": 95
  },
  "fromWarehouseAfter": {
    "quantity": 90,
    "available": 85
  },
  "toWarehouseBefore": {
    "quantity": 20,
    "available": 20
  },
  "toWarehouseAfter": {
    "quantity": 30,
    "available": 30
  },
  "timestamp": "2025-12-01T19:00:00.000Z"
}
```

## Frontend Changes Needed

### 1. Update Add Product Dialog

File: `frontend/app/dashboard/inventory/components/add-product-dialog.tsx`

Add warehouse selection to the form:

```typescript
// Add to ProductFormData interface
interface ProductFormData {
  // ... existing fields ...
  warehouseId?: string; // Add this
}

// Add to initialFormData
const initialFormData: ProductFormData = {
  // ... existing fields ...
  warehouseId: undefined, // Will use main warehouse if not set
};
```

Add warehouse selection in the Inventory tab:

```tsx
<TabsContent value="inventory" className="space-y-4 mt-4">
  <div className="grid grid-cols-2 gap-4">
    {/* Add Warehouse Selection */}
    <div className="col-span-2 space-y-2">
      <Label htmlFor="warehouse">
        Initial Warehouse Location <span className="text-red-500">*</span>
      </Label>
      <WarehouseSelect
        value={formData.warehouseId}
        onValueChange={(value) => handleInputChange("warehouseId", value)}
      />
      <p className="text-sm text-gray-500">
        Products will be allocated to the main warehouse by default
      </p>
    </div>

    {/* Existing fields ... */}
    <div className="space-y-2">
      <Label htmlFor="quantity">Current Quantity</Label>
      {/* ... */}
    </div>
  </div>
</TabsContent>
```

Update the submit handler:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!validateForm()) {
    return;
  }

  setIsLoading(true);

  try {
    const payload = {
      // ... existing fields ...
      warehouseId: formData.warehouseId || undefined, // Add this
    };

    const response = await fetch("http://localhost:5000/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    // ... rest of the handler
  } catch (error) {
    // ... error handling
  }
};
```

### 2. Create Warehouse Select Component

File: `frontend/components/ui/warehouse-select.tsx` (new file)

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Warehouse {
  id: string;
  code: string;
  name: string;
  location: string;
  isActive: boolean;
}

interface WarehouseSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
}

export function WarehouseSelect({
  value,
  onValueChange,
  disabled,
}: WarehouseSelectProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await fetch(
        "http://localhost:5000/warehouses?isActive=true&limit=100",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch warehouses");
      }

      const data = await response.json();
      setWarehouses(data.data || []);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      toast.error("Failed to load warehouses");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-2 border rounded-md">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="ml-2 text-sm text-gray-500">Loading warehouses...</span>
      </div>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder="Select warehouse (default: main)" />
      </SelectTrigger>
      <SelectContent>
        {warehouses.map((warehouse) => (
          <SelectItem key={warehouse.id} value={warehouse.id}>
            {warehouse.code} - {warehouse.name} ({warehouse.location})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### 3. Add Stock Transfer Dialog

File: `frontend/app/dashboard/inventory/components/transfer-stock-dialog.tsx` (new file)

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { WarehouseSelect } from "@/components/ui/warehouse-select";

interface TransferStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId?: string;
  productName?: string;
  fromWarehouseId?: string;
  availableQuantity?: number;
  onTransferComplete?: () => void;
}

export function TransferStockDialog({
  open,
  onOpenChange,
  productId,
  productName,
  fromWarehouseId,
  availableQuantity = 0,
  onTransferComplete,
}: TransferStockDialogProps) {
  const [formData, setFormData] = useState({
    toWarehouseId: "",
    quantity: "",
    reason: "",
    reference: "",
    notes: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = (): boolean => {
    if (!productId) {
      toast.error("Product not selected");
      return false;
    }

    if (!fromWarehouseId) {
      toast.error("Source warehouse not selected");
      return false;
    }

    if (!formData.toWarehouseId) {
      toast.error("Please select destination warehouse");
      return false;
    }

    if (formData.toWarehouseId === fromWarehouseId) {
      toast.error("Source and destination warehouses must be different");
      return false;
    }

    const quantity = parseInt(formData.quantity);
    if (!quantity || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return false;
    }

    if (quantity > availableQuantity) {
      toast.error(
        `Quantity exceeds available stock (${availableQuantity} available)`
      );
      return false;
    }

    if (!formData.reason.trim()) {
      toast.error("Please provide a reason for transfer");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        productId,
        fromWarehouseId,
        toWarehouseId: formData.toWarehouseId,
        quantity: parseInt(formData.quantity),
        reason: formData.reason,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      };

      const response = await fetch("http://localhost:5000/inventory/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to transfer stock");
      }

      const result = await response.json();
      
      toast.success(
        `Successfully transferred ${result.quantity} units from ${result.fromWarehouseBefore.quantity} to ${result.toWarehouseAfter.quantity}`
      );

      // Reset form
      setFormData({
        toWarehouseId: "",
        quantity: "",
        reason: "",
        reference: "",
        notes: "",
      });

      onOpenChange(false);
      onTransferComplete?.();
    } catch (error) {
      console.error("Error transferring stock:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to transfer stock"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Transfer Stock</DialogTitle>
          <DialogDescription>
            Transfer inventory from one warehouse to another
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Product Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">Product: {productName}</p>
              <p className="text-sm text-gray-600">
                Available Quantity: {availableQuantity} units
              </p>
            </div>

            {/* Destination Warehouse */}
            <div className="space-y-2">
              <Label htmlFor="toWarehouse">
                Destination Warehouse <span className="text-red-500">*</span>
              </Label>
              <WarehouseSelect
                value={formData.toWarehouseId}
                onValueChange={(value) => handleInputChange("toWarehouseId", value)}
              />
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">
                Quantity <span className="text-red-500">*</span>
              </Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={availableQuantity}
                placeholder="Enter quantity to transfer"
                value={formData.quantity}
                onChange={(e) => handleInputChange("quantity", e.target.value)}
                required
              />
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Input
                id="reason"
                placeholder="e.g., Stock rebalancing, Branch transfer"
                value={formData.reason}
                onChange={(e) => handleInputChange("reason", e.target.value)}
                required
              />
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number (Optional)</Label>
              <Input
                id="reference"
                placeholder="e.g., TRANS-001"
                value={formData.reference}
                onChange={(e) => handleInputChange("reference", e.target.value)}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes about this transfer..."
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Transfer Stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Update Inventory Page to Include Transfer Button

File: `frontend/app/dashboard/inventory/page.tsx`

Add the transfer button to your inventory table rows:

```tsx
import { TransferStockDialog } from "./components/transfer-stock-dialog";

// Add state for transfer dialog
const [transferDialogOpen, setTransferDialogOpen] = useState(false);
const [selectedInventory, setSelectedInventory] = useState<any>(null);

// In your table actions column
<Button
  variant="outline"
  size="sm"
  onClick={() => {
    setSelectedInventory(inventoryItem);
    setTransferDialogOpen(true);
  }}
  disabled={inventoryItem.available <= 0}
>
  <ArrowRightLeft className="h-4 w-4 mr-1" />
  Transfer
</Button>

// Add the dialog component
<TransferStockDialog
  open={transferDialogOpen}
  onOpenChange={setTransferDialogOpen}
  productId={selectedInventory?.productId}
  productName={selectedInventory?.productName}
  fromWarehouseId={selectedInventory?.warehouseId}
  availableQuantity={selectedInventory?.available}
  onTransferComplete={() => {
    // Refresh inventory data
    fetchInventory();
  }}
/>
```

## Testing

### 1. Test Product Creation with Default Warehouse

**Request:**
```bash
POST http://localhost:5000/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "sku": "TEST-001",
  "name": "Test Product",
  "cost_price": 100,
  "unit_price": 150,
  "quantity": 50
}
```

**Expected Result:**
- Product created successfully
- Inventory record created in main warehouse with quantity 50

### 2. Test Product Creation with Specific Warehouse

**Request:**
```bash
POST http://localhost:5000/products
Authorization: Bearer <token>
Content-Type: application/json

{
  "sku": "TEST-002",
  "name": "Test Product 2",
  "cost_price": 100,
  "unit_price": 150,
  "quantity": 30,
  "warehouseId": "specific_warehouse_id"
}
```

**Expected Result:**
- Product created successfully
- Inventory record created in specified warehouse with quantity 30

### 3. Test Stock Transfer

**Request:**
```bash
POST http://localhost:5000/inventory/transfer
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "product_id",
  "fromWarehouseId": "warehouse_1",
  "toWarehouseId": "warehouse_2",
  "quantity": 10,
  "reason": "Branch transfer"
}
```

**Expected Result:**
- Stock decreased in source warehouse
- Stock increased in destination warehouse
- Both operations successful or both rolled back

## Database Verification

Check inventory records:
```sql
-- View all inventory for a product
SELECT 
  i.id,
  p.sku,
  p.name as product_name,
  w.code as warehouse_code,
  w.name as warehouse_name,
  i.quantity,
  i.reserved,
  i.available,
  i.status
FROM inventory i
JOIN products p ON i."productId" = p.id
JOIN warehouses w ON i."warehouseId" = w.id
WHERE p.sku = 'TEST-001';

-- Check transfer history (you may want to add an audit table)
SELECT * FROM inventory 
WHERE "productId" = 'product_id'
ORDER BY "updatedAt" DESC;
```

## Notes

1. **Main Warehouse**: The system defines the main warehouse as the first warehouse created (oldest by `createdAt`). You may want to add a `isMain` boolean flag to the warehouse model for more explicit control.

2. **Transaction Safety**: All operations that modify multiple records use Prisma transactions to ensure data consistency.

3. **Inventory Status**: The system automatically calculates inventory status based on quantity and reorder levels:
   - `out_of_stock`: quantity = 0
   - `low_stock`: quantity < reorder_level
   - `in_stock`: quantity >= reorder_level

4. **Error Handling**: The system validates:
   - Warehouse exists and is active
   - Sufficient stock for transfers
   - Source and destination warehouses are different
   - Product and inventory records exist

## Future Enhancements

1. Add `isMain` flag to warehouse model
2. Create transfer history/audit table
3. Add batch transfer functionality
4. Implement transfer approval workflow
5. Add email notifications for transfers
6. Generate transfer receipts/documents
