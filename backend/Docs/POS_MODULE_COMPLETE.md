# POS Module - Complete Implementation Guide

## Overview

This is a comprehensive Point of Sale (POS) module for a multi-branch ERP system with full inventory management, payment processing, and receipt generation.

## Technology Stack

- **Frontend**: Next.js 16 + Tailwind CSS 4 + shadcn/ui
- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: Custom JWT with role-based access (cashier, manager, admin)

## Database Schema

### Enhanced Models

#### Payment Method Enum

```prisma
enum PaymentMethod {
  cash
  card
  mpesa
  cheque
  bank_transfer
}
```

#### Product Model

- Added `tax_rate` field (default 16% VAT)
- Supports barcode and SKU lookup

#### Sales Model

Enhanced with:

- `payment_method`: Payment type
- `subtotal`: Before tax and discount
- `discount_approved_by`: Manager ID for discounts > 10%
- `amount_paid` and `change`: Payment tracking
- Composite indexes for performance

#### SalesItem Model

Enhanced with:

- `tax_rate`: Per-item tax rate
- `discount_percent`: Percentage discount
- `subtotal`, `tax_amount`, `amount`: Calculated fields
- Unique constraint on (salesId, productId)

## Backend API Endpoints

### 1. Product Search

**POST** `/pos/products/search`

Search products by SKU or barcode.

```typescript
Request:
{
  "search": "LAP-001",  // SKU or barcode
  "branchId": "cm..."    // Optional: filter by branch inventory
}

Response:
{
  "success": true,
  "data": {
    "id": "cm...",
    "sku": "LAP-001",
    "barcode": "123456789001",
    "name": "Dell Latitude 5420",
    "unit_price": 120000,
    "tax_rate": 0.16,
    "totalAvailable": 60,
    "inventory": [...]
  }
}
```

### 2. Create Sale

**POST** `/pos/sales`

Create a new sale with automatic inventory decrement.

```typescript
Request:
{
  "branchId": "cm...",
  "userId": "cm...",
  "payment_method": "cash",  // Required
  "amount_paid": 150000,     // Optional
  "discount": 5000,          // Optional
  "discount_approved_by": "cm...",  // Required if discount > 10%
  "items": [
    {
      "productId": "cm...",
      "quantity": 1,
      "unit_price": 120000,
      "discount": 0,
      "tax_rate": 0.16
    }
  ],
  "notes": "Customer notes"
}

Response:
{
  "success": true,
  "data": {
    "id": "cm...",
    "invoice_no": "INV-202411-1731673824407",
    "status": "confirmed",
    "payment_method": "cash",
    "subtotal": 120000,
    "tax": 19200,
    "discount": 5000,
    "grand_total": 134200,
    "amount_paid": 150000,
    "change": 15800,
    "items": [...]
  }
}
```

**Business Rules:**

- Validates inventory availability
- Discounts > 10% require manager approval
- Automatically decrements inventory
- Creates finance transaction
- Generates unique invoice number

### 3. Get Sale by ID

**GET** `/pos/sales/:id`

Retrieve detailed sale information.

### 4. List Sales

**GET** `/pos/sales`

List sales with filtering and pagination.

Query Parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `status`: Filter by status
- `branchId`: Filter by branch
- `payment_method`: Filter by payment method
- `startDate`: Start date (ISO string)
- `endDate`: End date (ISO string)

### 5. Update Sale

**PATCH** `/pos/sales/:id`

Update sale details (managers only).

### 6. Daily Summary

**GET** `/pos/sales/daily-summary?branch_id=:id&date=:date`

Get aggregated daily sales summary.

```typescript
Response:
{
  "success": true,
  "data": {
    "date": "2024-11-15",
    "branchId": "cm...",
    "branchName": "Westlands Branch",
    "total_sales": 25,
    "total_transactions": 25,
    "total_revenue": 3000000,
    "total_tax": 480000,
    "total_discount": 50000,
    "payment_methods": {
      "cash": 1500000,
      "card": 1000000,
      "mpesa": 500000,
      "cheque": 0,
      "bank_transfer": 0
    },
    "top_products": [
      {
        "productId": "cm...",
        "productName": "Dell Latitude 5420",
        "quantity_sold": 15,
        "revenue": 1800000
      }
    ]
  }
}
```

### 7. Generate Receipt

**GET** `/pos/sales/:id/receipt`

Generate receipt data for printing/ETR integration.

```typescript
Response:
{
  "success": true,
  "data": {
    "sale": { ... },
    "branch": {
      "name": "Westlands Branch",
      "address": "Westlands, Nairobi",
      "phone": "+254 722 111 001",
      "code": "WL-001"
    },
    "cashier": {
      "name": "Alice Johnson",
      "email": "cashier@lunatech.co.ke"
    },
    "company": {
      "name": "LUNATECH SYSTEMS LTD",
      "address": "123 Tech Plaza, Westlands",
      "phone": "+254 722 123 456",
      "email": "info@lunatech.co.ke",
      "kra_pin": "P051472913Q"
    }
  }
}
```

### 8. Approve Discount

**POST** `/pos/discount/approve`

Manager override for discounts > 10%.

```typescript
Request:
{
  "salesId": "cm...",
  "managerId": "cm...",
  "managerPassword": "password123"
}

Response:
{
  "success": true,
  "message": "Discount approved successfully"
}
```

## Role-Based Access Control

### Cashier

- ✅ Search products
- ✅ Create sales (with inventory decrement)
- ✅ View sales
- ✅ View receipts
- ❌ Approve discounts > 10%
- ❌ View daily summary
- ❌ Update sales

### Manager

- ✅ All cashier permissions
- ✅ Approve discounts > 10%
- ✅ View daily summary
- ✅ Update sales status

### Admin

- ✅ All permissions

## Receipt JSON Structure

Ready for ETR/eTIMS integration:

```json
{
  "receipt_type": "sale",
  "invoice_no": "INV-202411-1731673824407",
  "date": "2024-11-15T10:30:24.407Z",
  "company": {
    "name": "LUNATECH SYSTEMS LTD",
    "kra_pin": "P051472913Q",
    "address": "123 Tech Plaza, Westlands",
    "phone": "+254 722 123 456"
  },
  "branch": {
    "code": "WL-001",
    "name": "Westlands Branch",
    "address": "Westlands, Nairobi"
  },
  "cashier": {
    "name": "Alice Johnson",
    "id": "cm..."
  },
  "items": [
    {
      "name": "Dell Latitude 5420",
      "sku": "LAP-001",
      "quantity": 1,
      "unit_price": 120000,
      "subtotal": 120000,
      "tax_rate": 0.16,
      "tax_amount": 19200,
      "discount": 0,
      "amount": 139200
    }
  ],
  "totals": {
    "subtotal": 120000,
    "tax": 19200,
    "discount": 0,
    "grand_total": 139200
  },
  "payment": {
    "method": "cash",
    "amount_paid": 150000,
    "change": 10800
  },
  "etims_ready": true,
  "etr_compliant": true
}
```

## Migration Guide

### 1. Update Prisma Schema

The schema has been enhanced. Run:

```bash
cd backend
npx prisma migrate dev --name add_pos_enhancements
npx prisma generate
```

### 2. Seed Test Data

Update your seed file if needed, then:

```bash
npm run db:seed
```

### 3. Test Backend Endpoints

```bash
# Start backend
npm run dev

# The server should start on http://localhost:5000
```

Test with curl or Postman:

```bash
# Search product
curl -X POST http://localhost:5000/pos/products/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"search": "LAP-001"}'

# Create sale
curl -X POST http://localhost:5000/pos/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "BRANCH_ID",
    "userId": "USER_ID",
    "payment_method": "cash",
    "amount_paid": 150000,
    "items": [{
      "productId": "PRODUCT_ID",
      "quantity": 1,
      "unit_price": 120000
    }]
  }'
```

## Error Handling

The system handles these error cases:

1. **Insufficient Inventory**

   ```json
   {
     "success": false,
     "error": {
       "code": "VALIDATION_ERROR",
       "message": "Insufficient inventory for product cm..."
     }
   }
   ```

2. **Discount Approval Required**

   ```json
   {
     "success": false,
     "error": {
       "code": "FORBIDDEN",
       "message": "Discounts greater than 10% require manager approval"
     }
   }
   ```

3. **Product Not Found**
   ```json
   {
     "success": false,
     "error": {
       "code": "NOT_FOUND",
       "message": "Product LAP-999 not found"
     }
   }
   ```

## Testing

### Manual Testing Checklist

- [ ] Search product by SKU
- [ ] Search product by barcode
- [ ] Create sale with single item
- [ ] Create sale with multiple items
- [ ] Apply discount < 10%
- [ ] Try discount > 10% without approval (should fail)
- [ ] Approve discount as manager
- [ ] Create sale with approved discount
- [ ] Verify inventory decremented
- [ ] Generate receipt
- [ ] View daily summary
- [ ] Test all payment methods

### Unit Tests (To be implemented)

```typescript
// Example test structure
describe("POS Service", () => {
  describe("createSales", () => {
    it("should create sale and decrement inventory", async () => {
      // Test implementation
    });

    it("should require manager approval for discounts > 10%", async () => {
      // Test implementation
    });

    it("should throw error for insufficient inventory", async () => {
      // Test implementation
    });
  });
});
```

## ETR/eTIMS Integration Adapter

The receipt structure is ready for KRA eTIMS integration. Create an adapter:

```typescript
// etims-adapter.ts
export class EtimsAdapter {
  async submitReceipt(receipt: ReceiptDTO) {
    // Transform receipt to eTIMS format
    const etimsFormat = {
      invoiceNumber: receipt.sale.invoice_no,
      pinOfBuyer: "", // Optional
      //... map all fields
    };

    // Submit to eTIMS API
    const response = await fetch("https://etims.kra.go.ke/api/receipt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ETIMS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(etimsFormat),
    });

    return response.json();
  }
}
```

## Performance Considerations

1. **Database Indexes**: All foreign keys and frequently queried fields are indexed
2. **Transactions**: Inventory updates use Prisma transactions for atomicity
3. **Pagination**: All list endpoints support pagination
4. **Composite Indexes**: Added for common query patterns (branch_id, created_date)

## Security

1. **JWT Authentication**: All endpoints require valid JWT token
2. **Role-Based Access**: Enforced at route level
3. **Manager Password Verification**: Required for discount approval
4. **SQL Injection Protection**: Prisma parameterized queries
5. **Input Validation**: All inputs validated before processing

## Next Steps

1. **Frontend Implementation**: Create Next.js POS page (see FRONTEND_GUIDE.md)
2. **Unit Tests**: Add comprehensive test coverage
3. **Integration Tests**: End-to-end testing
4. **ETR Integration**: Implement eTIMS adapter
5. **Print Service**: Add receipt printing functionality
6. **Offline Mode**: Consider offline-first architecture

## Support

For issues or questions:

- Check logs: `backend/logs/`
- Database inspection: `npm run db:studio`
- API testing: Use Postman collection (to be created)

## License

Proprietary - Lunatech Systems Ltd
