# POS Module - API Testing Guide

## Quick API Testing

### Prerequisites

1. Backend running: `npm run dev` (from `/backend`)
2. JWT token from login
3. Valid branch ID and user ID

---

## Test Case 1: Successful Sale

### Request

```bash
curl -X POST http://localhost:5000/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "branchId": "default-branch-id",
    "userId": "your-cashier-id",
    "items": [
      {
        "productId": "product-id-1",
        "quantity": 2,
        "unit_price": 99.99,
        "discount": 0
      },
      {
        "productId": "product-id-2",
        "quantity": 1,
        "unit_price": 49.99,
        "discount": 5
      }
    ],
    "discount": 10,
    "tax": 20.50,
    "payment_method": "cash",
    "notes": "Regular customer"
  }'
```

### Expected Response (201)

```json
{
  "success": true,
  "data": {
    "id": "sales-12345",
    "invoice_no": "INV-1731427520000",
    "status": "confirmed",
    "branchId": "default-branch-id",
    "userId": "your-cashier-id",
    "total_amount": 249.97,
    "discount": 10,
    "tax": 20.5,
    "grand_total": 260.47,
    "items": [
      {
        "id": "item-1",
        "productId": "product-id-1",
        "quantity": 2,
        "unit_price": 99.99,
        "discount": 0,
        "amount": 199.98,
        "product": {
          "id": "product-id-1",
          "sku": "PROD001",
          "name": "Product Name"
        }
      }
    ],
    "created_date": "2024-11-13T15:30:00.000Z",
    "createdAt": "2024-11-13T15:30:00.000Z"
  }
}
```

---

## Test Case 2: Insufficient Inventory

### Request

```bash
curl -X POST http://localhost:5000/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "branchId": "default-branch-id",
    "userId": "your-cashier-id",
    "items": [
      {
        "productId": "product-id-1",
        "quantity": 999999,
        "unit_price": 99.99
      }
    ]
  }'
```

### Expected Response (400)

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_INVENTORY",
    "message": "Insufficient inventory for product product-id-1. Requested: 999999, Available: 50",
    "statusCode": 400
  }
}
```

---

## Test Case 3: Invalid Request

### Request (Missing required fields)

```bash
curl -X POST http://localhost:5000/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "branchId": "default-branch-id"
  }'
```

### Expected Response (400)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required fields: branchId, userId, items",
    "statusCode": 400
  }
}
```

---

## Test Case 4: Unauthorized

### Request (No token)

```bash
curl -X POST http://localhost:5000/sales \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "default-branch-id",
    "userId": "your-cashier-id",
    "items": []
  }'
```

### Expected Response (401)

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No authorization token provided",
    "statusCode": 401
  }
}
```

---

## Test Case 5: Get Sale by ID

### Request

```bash
curl -X GET http://localhost:5000/sales/{sale-id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response (200)

```json
{
  "success": true,
  "data": {
    "id": "sales-12345",
    "invoice_no": "INV-1731427520000",
    "status": "confirmed",
    "total_amount": 249.97,
    "discount": 10,
    "tax": 20.50,
    "grand_total": 260.47,
    "items": [...]
  }
}
```

---

## Test Case 6: List Sales

### Request

```bash
curl -X GET "http://localhost:5000/sales?page=1&limit=10&status=confirmed" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Expected Response (200)

```json
{
  "success": true,
  "data": [
    {
      "id": "sales-12345",
      "invoice_no": "INV-1731427520000",
      "status": "confirmed",
      ...
    }
  ],
  "pagination": {
    "total": 45,
    "page": 1,
    "limit": 10
  }
}
```

---

## Postman Collection

### Import this into Postman

```json
{
  "info": {
    "name": "POS Module API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Sale",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"branchId\": \"branch-1\",\n  \"userId\": \"user-1\",\n  \"items\": [\n    {\n      \"productId\": \"prod-1\",\n      \"quantity\": 2,\n      \"unit_price\": 99.99\n    }\n  ],\n  \"discount\": 10,\n  \"tax\": 15,\n  \"payment_method\": \"cash\"\n}"
        },
        "url": {
          "raw": "http://localhost:5000/sales",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["v1", "sales"]
        }
      }
    },
    {
      "name": "Get Sale",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:5000/sales/{{saleId}}",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["v1", "sales", "{{saleId}}"]
        }
      }
    },
    {
      "name": "List Sales",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "http://localhost:5000/sales?page=1&limit=10&status=confirmed",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["v1", "sales"],
          "query": [
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "10"
            },
            {
              "key": "status",
              "value": "confirmed"
            }
          ]
        }
      }
    }
  ]
}
```

---

## Frontend Testing

### 1. Navigate to POS Page

```
http://localhost:3000/dashboard/pos
```

### 2. Add Product

- Enter SKU: `PROD001`
- Click "Add"
- Verify cart updates

### 3. Adjust Quantity

- Click `+` to increase
- Click `-` to decrease
- Verify totals update in real-time

### 4. Select Payment

- Click payment dropdown
- Select "Cash", "Card", "Check", or "Online"
- Verify selection persists

### 5. Checkout

- Click "Complete Sale"
- Observe:
  - Loading state
  - Success toast with invoice number
  - Print dialog appears
  - Cart clears

### 6. Error Handling

- Try adding non-existent SKU → Error toast
- Try checking out with empty cart → Warning toast
- Test print functionality

---

## Database Verification

After a successful sale, verify data changes:

### Check Sale Created

```sql
SELECT * FROM sales
WHERE invoice_no = 'INV-1731427520000';
```

### Check Inventory Decremented

```sql
SELECT id, productId, quantity, available
FROM inventory
WHERE productId IN (SELECT product_id FROM sales_items WHERE sales_id = 'sales-12345');

-- Before: quantity=100, available=100
-- After:  quantity=98, available=98 (if sold 2 units)
```

### Check Product Quantity Updated

```sql
SELECT id, sku, name, quantity
FROM products
WHERE id IN (SELECT productId FROM inventory WHERE quantity < 100);

-- Should show decremented quantities
```

### Check Sale Items

```sql
SELECT * FROM sales_items
WHERE sales_id = 'sales-12345';

-- Should have 2 rows (2 items purchased)
```

---

## Performance Testing

### Load Testing

```bash
# Test with ApacheBench (ab)
ab -n 100 -c 10 -p data.json -T application/json \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/sales
```

### Stress Testing

- Create 1000 sales concurrently
- Verify no inventory overselling
- Check database doesn't get corrupted

---

## Error Codes

| Error                    | Status | Meaning                |
| ------------------------ | ------ | ---------------------- |
| `INSUFFICIENT_INVENTORY` | 400    | Not enough stock       |
| `VALIDATION_ERROR`       | 400    | Missing/invalid fields |
| `NOT_FOUND`              | 404    | Sale/product not found |
| `UNAUTHORIZED`           | 401    | No valid token         |
| `FORBIDDEN`              | 403    | User not authorized    |
| `INTERNAL_ERROR`         | 500    | Server error           |

---

## Success Indicators

✅ Sale created with invoice number  
✅ Inventory quantities decremented  
✅ Product quantities updated  
✅ Tax calculated correctly  
✅ Grand total accurate  
✅ Toast notifications displayed  
✅ Print dialog appears  
✅ Cart clears after checkout  
✅ Database transactions atomic  
✅ No inventory overselling

---

## Troubleshooting

### "Insufficient Inventory" on valid quantity

Check:

```sql
SELECT * FROM inventory WHERE productId = 'prod-id';
```

Ensure `available >= requested quantity`

### "Product not found"

Verify product exists:

```sql
SELECT * FROM products WHERE id = 'prod-id';
```

### Receipt doesn't print

- Check browser pop-up blocker
- Check console for JavaScript errors
- Verify `window.open()` works

### Payment method not saving

- Verify Select component is properly connected
- Check value is being passed to API
- Inspect network tab in DevTools

---

## Integration Notes

### With Real Backend

Replace mock products in `app/dashboard/pos/page.tsx`:

```typescript
// BEFORE: Mock products
const mockProducts: Product[] = [...]

// AFTER: API call
const response = await fetch(`/api/products?sku=${searchSku}`, {
  headers: { Authorization: `Bearer ${token}` }
});
const product = await response.json();
```

### With Real Inventory API

Add before checkout:

```typescript
// Verify inventory one more time
const inventoryCheck = await fetch(`/api/inventory/${item.productId}`, {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

**Happy Testing!** 🚀
