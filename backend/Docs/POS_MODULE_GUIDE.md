# POS Module Implementation Guide

## Overview

The POS (Point of Sale) module is a complete transaction management system that includes inventory decrement transactions, cart management, and receipt generation.

---

## Backend Implementation

### Architecture

```
Backend POS Module:
├── Controller Layer (HTTP handlers)
├── Service Layer (business logic & transactions)
├── DTO Layer (data validation)
└── Database Layer (Prisma)
```

### Key Features

✅ **Atomic Transactions**: Inventory decrement happens in a database transaction  
✅ **Inventory Management**: Auto-updates inventory and product quantities  
✅ **Invoice Generation**: Unique invoice numbers with timestamps  
✅ **Order Totals**: Calculates subtotal, tax, and grand total  
✅ **Immediate Confirmation**: Sales status set to "confirmed" upon creation

### Database Models

**Sales Model**

```prisma
model Sales {
  id            String    @id @default(cuid())
  invoice_no    String    @unique
  status        SalesStatus       // draft, pending, confirmed, shipped, delivered
  branchId      String
  userId        String            // Cashier
  items         SalesItem[]
  total_amount  Float
  discount      Float
  tax           Float
  grand_total   Float
  created_date  DateTime  @default(now())
}

model SalesItem {
  id            String    @id @default(cuid())
  salesId       String
  productId     String
  quantity      Int
  unit_price    Float
  discount      Float
  amount        Float     // (quantity * unit_price) - discount
}

model Inventory {
  id            String    @id @default(cuid())
  quantity      Int       // Total quantity
  available     Int       // Quantity - reserved
  status        InventoryStatus
  productId     String
  warehouseId   String
}
```

### Backend API Endpoint

**POST /sales - Create POS Transaction**

Request:

```json
{
  "branchId": "branch-123",
  "userId": "cashier-456",
  "items": [
    {
      "productId": "prod-001",
      "quantity": 2,
      "unit_price": 99.99,
      "discount": 0
    },
    {
      "productId": "prod-002",
      "quantity": 1,
      "unit_price": 49.99,
      "discount": 5.0
    }
  ],
  "discount": 10,
  "tax": 15.5,
  "payment_method": "cash",
  "notes": "Customer is regular"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "sales-789",
    "invoice_no": "INV-1731427520000",
    "status": "confirmed",
    "items": [
      {
        "id": "item-001",
        "productId": "prod-001",
        "product": {
          "sku": "PROD001",
          "name": "Laptop"
        },
        "quantity": 2,
        "unit_price": 99.99,
        "discount": 0,
        "amount": 199.98
      }
    ],
    "total_amount": 249.97,
    "discount": 10,
    "tax": 15.5,
    "grand_total": 255.47,
    "payment_method": "cash",
    "created_date": "2024-11-13T15:12:00Z"
  }
}
```

### POS Service (Backend)

**File**: `backend/src/modules/pos/service/index.ts`

Key Method: `createSales(dto)`

```typescript
async createSales(dto: CreateSalesDTO): Promise<SalesResponseDTO> {
  // 1. Validate inventory availability
  for (const item of dto.items) {
    const inventory = await this.prisma.inventory.findFirst({
      where: { productId: item.productId }
    });

    if (inventory.available < item.quantity) {
      throw insufficientInventoryError(...);
    }
  }

  // 2. Calculate totals
  const total_amount = calculateSubtotal(items);
  const tax = dto.tax || (total_amount * 0.1);
  const grand_total = total_amount - discount + tax;

  // 3. Database transaction (atomic operation)
  const sales = await this.prisma.$transaction(async (tx) => {
    // Create sales order
    const newSales = await tx.sales.create({
      data: {
        invoice_no: `INV-${Date.now()}`,
        status: "confirmed",
        items: { create: [...] }
      }
    });

    // Decrement inventory for each item
    for (const item of items) {
      await tx.inventory.update({
        data: {
          quantity: inventory.quantity - item.quantity,
          available: inventory.available - item.quantity
        }
      });

      // Update product total quantity
      await tx.product.update({
        data: {
          quantity: product.quantity - item.quantity
        }
      });
    }

    return newSales;
  });

  return formatResponse(sales);
}
```

### Transaction Flow

```
POS Transaction Flow:
┌─────────────────────────────────────────────────────┐
│ 1. Client submits cart items with quantities        │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 2. Server validates inventory availability          │
│    - Check Inventory.available >= requested qty     │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 3. Calculate totals (subtotal, tax, grand_total)   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 4. Start database transaction                       │
│    ┌──────────────────────────────────────────────┐ │
│    │ A. Create Sales record with items            │ │
│    │ B. Decrement Inventory.quantity              │ │
│    │ C. Decrement Inventory.available             │ │
│    │ D. Decrement Product.quantity                │ │
│    └──────────────────────────────────────────────┘ │
│    (All succeed or all rollback)                   │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ 5. Return Sale with invoice number & details       │
└─────────────────────────────────────────────────────┘
```

---

## Frontend Implementation

### Architecture

```
Frontend POS Module:
├── POS Page (/dashboard/pos)
├── Cart Management (state)
├── Payment Selection (Select component)
├── Cart Display (Table component)
├── Toast Notifications (useToast hook)
└── Receipt Printing (browser print API)
```

### Components Used

**UI Components**:

- `Button` - Checkout, Add to Cart buttons
- `Input` - SKU search field
- `Table` - Cart items display
- `Select` - Payment method selection
- `Card` - Order summary sidebar

**Custom Components**:

- `Toast Context` - Success/error notifications

### POS Page Features

**File**: `frontend/app/dashboard/pos/page.tsx`

Features:

1. **Product Search by SKU**
   - Input field accepts product SKU
   - Auto-detects product details
   - Validates inventory availability

2. **Shopping Cart**
   - Add items with quantity
   - Adjust quantity up/down
   - Remove items
   - Real-time total calculation

3. **Order Summary**
   - Subtotal calculation
   - 10% Tax calculation
   - Grand total display

4. **Payment Selection**
   - 4 payment methods:
     - Cash
     - Credit/Debit Card
     - Check
     - Online Transfer

5. **Checkout Process**
   - Validates cart not empty
   - Sends to backend API
   - Shows loading state
   - Displays invoice number

6. **Receipt Generation**
   - Opens print dialog
   - Formats receipt with:
     - Invoice number
     - Cashier name
     - Item details
     - Totals
     - Payment method

### State Management

```typescript
interface CartItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit_price: number;
  quantity: number;
  discount: number;
  available: number; // For inventory validation
}

// Cart state
const [cart, setCart] = useState<CartItem[]>([]);

// Calculations
const subtotal = cart.reduce(
  (sum, item) => sum + (item.quantity * item.unit_price - item.discount),
  0
);
const tax = subtotal * 0.1;
const grandTotal = subtotal + tax;
```

### API Integration

**Add Product to Cart (Frontend)**

```typescript
// Simulated - in real app would call GET /products?sku=X
const product = mockProducts.find((p) => p.sku === searchSku);

if (!product) {
  toast("Product not found", "error");
  return;
}

setCart([
  ...cart,
  {
    id: product.id,
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unit_price: product.unit_price,
    quantity: 1,
    discount: 0,
    available: product.quantity,
  },
]);
```

**Checkout (Frontend)**

```typescript
const response = await fetch("/api/sales", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    branchId: "default-branch",
    userId: user.id,
    items: cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount,
    })),
    discount: 0,
    tax: tax,
    payment_method: paymentMethod,
  }),
});
```

### Toast Notifications

**File**: `frontend/lib/toast-context.tsx`

```typescript
const { toast } = useToast();

// Success
toast("Product added to cart", "success");

// Error
toast("Insufficient inventory", "error");

// Warning
toast("Please enter a SKU", "warning");

// Info
toast("Item removed from cart", "info");
```

Toast types: `"success" | "error" | "warning" | "info"`

---

## UI Components

### Table Component

**File**: `frontend/components/ui/table.tsx`

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>SKU</TableHead>
      <TableHead>Product</TableHead>
      <TableHead>Price</TableHead>
      <TableHead>Qty</TableHead>
      <TableHead>Subtotal</TableHead>
      <TableHead>Action</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {cartItems.map((item) => (
      <TableRow key={item.productId}>
        <TableCell>{item.sku}</TableCell>
        <TableCell>{item.name}</TableCell>
        <TableCell>${item.unit_price}</TableCell>
        <TableCell>{item.quantity}</TableCell>
        <TableCell>${item.quantity * item.unit_price}</TableCell>
        <TableCell>
          <button onClick={() => removeItem(item.productId)}>
            <MdDelete />
          </button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Select Component

**File**: `frontend/components/ui/select.tsx`

```tsx
<Select value={paymentMethod} onValueChange={setPaymentMethod}>
  <SelectTrigger>
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="cash">Cash</SelectItem>
    <SelectItem value="card">Credit/Debit Card</SelectItem>
    <SelectItem value="check">Check</SelectItem>
    <SelectItem value="online">Online Transfer</SelectItem>
  </SelectContent>
</Select>
```

---

## Testing the POS Module

### Backend Testing

**1. Test Insufficient Inventory**

```bash
curl -X POST http://localhost:5000/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "branchId": "branch-1",
    "userId": "user-1",
    "items": [
      {
        "productId": "prod-1",
        "quantity": 10000,
        "unit_price": 99.99
      }
    ]
  }'
```

Expected: Error 400 - "Insufficient inventory"

**2. Test Successful Transaction**

```bash
curl -X POST http://localhost:5000/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "branchId": "branch-1",
    "userId": "user-1",
    "items": [
      {
        "productId": "prod-1",
        "quantity": 2,
        "unit_price": 99.99
      }
    ],
    "discount": 10,
    "tax": 15,
    "payment_method": "cash"
  }'
```

Expected: Success 201 - Sales created with invoice number

**3. Verify Inventory Decremented**

```bash
# Check product quantity after sale
SELECT quantity FROM products WHERE id = 'prod-1';
# Should be decremented by 2

# Check inventory after sale
SELECT available FROM inventory WHERE product_id = 'prod-1';
# Should be decremented by 2
```

### Frontend Testing

**1. Add Product to Cart**

- Enter SKU: PROD001
- Click "Add"
- Verify item appears in cart

**2. Adjust Quantity**

- Click + button to increase
- Click - button to decrease
- Verify subtotal updates

**3. Remove Item**

- Click delete icon
- Verify item removed
- Toast shows "Item removed"

**4. Select Payment Method**

- Click dropdown
- Select "Cash", "Card", "Check", or "Online"
- Verify selection persists

**5. Complete Sale**

- Add items to cart
- Select payment method
- Click "Complete Sale"
- Verify:
  - Loading state shows
  - Success toast appears
  - Invoice number displayed
  - Print dialog opens
  - Cart clears

---

## Troubleshooting

### Backend Issues

**"Insufficient inventory" error**

- Check Inventory.available >= requested quantity
- Verify product exists in inventory
- Solution: Add more inventory or reduce quantity

**"Product not found"**

- Verify product exists in database
- Check product ID matches exactly
- Solution: Create product first

**Database transaction rollback**

- Check for database connection issues
- Verify all required fields present
- Solution: Review logs for specific error

### Frontend Issues

**Select component not working**

- Ensure `@radix-ui/react-select` is installed
- Verify Select imports are correct
- Solution: Run `npm install`

**Toast not showing**

- Check `ToastProvider` wraps app in `app/layout.tsx`
- Verify `useToast()` called within Provider
- Solution: Add provider wrapper

**Receipt not printing**

- Check pop-up blocker isn't blocking print window
- Verify `window.open()` permissions
- Solution: Allow pop-ups in browser

---

## Future Enhancements

- [ ] Barcode scanning
- [ ] Discount codes
- [ ] Customer loyalty points
- [ ] Receipt email
- [ ] Cash drawer integration
- [ ] Multiple payment processing
- [ ] Refund/return handling
- [ ] Void transaction
- [ ] Daily reconciliation report

---

## Files Created/Modified

**Backend Files**:

- `src/modules/pos/dto/index.ts` - Updated with payment_method
- `src/modules/pos/service/index.ts` - Enhanced with atomic transactions
- `src/modules/pos/controller/index.ts` - Unchanged

**Frontend Files**:

- `components/ui/table.tsx` - Table component
- `components/ui/select.tsx` - Select component
- `lib/toast-context.tsx` - Toast notification system
- `app/dashboard/pos/page.tsx` - POS page with cart
- `package.json` - Updated with dependencies

**Dependencies Added**:

- Backend: Already has all dependencies
- Frontend: `@radix-ui/react-select`
