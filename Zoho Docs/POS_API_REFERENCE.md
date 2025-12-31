# POS API Quick Reference

## Base URL

```
http://localhost:5000/v1
```

## Authentication

All endpoints require JWT token except login/register:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### 1. Product Search

Search for products by SKU or barcode.

```http
POST /pos/products/search
Content-Type: application/json
Authorization: Bearer <token>

{
  "search": "LAP-001",
  "branchId": "optional_branch_id"
}
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "prod_001",
    "sku": "LAP-001",
    "barcode": "123456789001",
    "name": "Dell Latitude 5420",
    "description": "Professional Business Laptop",
    "category": "Computers",
    "unit_price": 120000,
    "cost_price": 95000,
    "tax_rate": 0.16,
    "quantity": 60,
    "available": 45,
    "inventory": [
      {
        "warehouseId": "wh_001",
        "warehouseName": "Main Warehouse",
        "quantity": 30,
        "reserved": 5,
        "available": 25,
        "status": "in_stock"
      }
    ]
  }
}
```

---

### 2. Create Sale

Process a new sales transaction.

```http
POST /pos/sales
Content-Type: application/json
Authorization: Bearer <token>

{
  "branchId": "branch_001",
  "userId": "user_001",
  "payment_method": "mpesa",
  "amount_paid": 140000,
  "discount": 2000,
  "discount_approved_by": "manager_id",  // Required if discount > 10%
  "notes": "Optional notes",
  "items": [
    {
      "productId": "prod_001",
      "quantity": 1,
      "unit_price": 120000,
      "tax_rate": 0.16,
      "discount": 2000,
      "discount_percent": 1.67
    }
  ]
}
```

**Payment Methods:**

- `cash`
- `card`
- `mpesa`
- `cheque`
- `bank_transfer`

**Response (201 Created):**

```json
{
  "success": true,
  "data": {
    "id": "sale_001",
    "invoice_no": "WL-001-20241116-0001",
    "status": "confirmed",
    "payment_method": "mpesa",
    "branchId": "branch_001",
    "userId": "user_001",
    "subtotal": 120000,
    "total_amount": 120000,
    "discount": 2000,
    "discount_approved_by": "manager_id",
    "tax": 18880,
    "grand_total": 136880,
    "amount_paid": 140000,
    "change": 3120,
    "items": [
      {
        "id": "item_001",
        "productId": "prod_001",
        "productName": "Dell Latitude 5420",
        "productSku": "LAP-001",
        "quantity": 1,
        "unit_price": 120000,
        "tax_rate": 0.16,
        "discount": 2000,
        "discount_percent": 1.67,
        "subtotal": 120000,
        "tax_amount": 18880,
        "amount": 136880
      }
    ],
    "created_date": "2024-11-16T10:30:45.123Z",
    "notes": "Optional notes"
  }
}
```

---

### 3. Get Sale Details

Retrieve complete information about a sale.

```http
GET /pos/sales/:id
Authorization: Bearer <token>
```

**Response (200 OK):**
Same as create sale response.

---

### 4. List Sales

Get a list of sales with filtering and pagination.

```http
GET /pos/sales?page=1&limit=20&status=confirmed&branchId=branch_001&payment_method=mpesa&startDate=2024-11-01&endDate=2024-11-16
Authorization: Bearer <token>
```

**Query Parameters:**

- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status
- `branchId` (optional): Filter by branch
- `payment_method` (optional): Filter by payment method
- `startDate` (optional): Start date (ISO format)
- `endDate` (optional): End date (ISO format)

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "sale_001",
      "invoice_no": "WL-001-20241116-0001",
      ...
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

### 5. Update Sale

Update a sale's status or other fields.

```http
PATCH /pos/sales/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "shipped",
  "notes": "Updated notes",
  "payment_method": "card"
}
```

**Allowed Roles:** Manager, Admin

**Response (200 OK):**
Same as get sale response.

---

### 6. Daily Summary

Get aggregated sales data for a specific date and branch.

```http
GET /pos/daily-summary?branch_id=branch_001&date=2024-11-16
Authorization: Bearer <token>
```

**Query Parameters:**

- `branch_id` (optional): Specific branch or omit for all branches
- `date` (optional): Date in YYYY-MM-DD format (default: today)

**Allowed Roles:** Manager, Admin

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "date": "2024-11-16",
    "branchId": "branch_001",
    "branchName": "Westlands Branch",
    "total_sales": 25,
    "total_transactions": 25,
    "total_revenue": 2500000,
    "total_tax": 400000,
    "total_discount": 15000,
    "payment_methods": {
      "cash": 800000,
      "card": 600000,
      "mpesa": 900000,
      "cheque": 100000,
      "bank_transfer": 100000
    },
    "top_products": [
      {
        "productId": "prod_001",
        "productName": "Dell Latitude 5420",
        "quantity_sold": 10,
        "revenue": 1200000
      },
      {
        "productId": "prod_002",
        "productName": "HP Elitebook 840",
        "quantity_sold": 8,
        "revenue": 920000
      }
    ]
  }
}
```

---

### 7. Generate Receipt

Get formatted receipt data for printing.

```http
GET /pos/sales/:id/receipt
Authorization: Bearer <token>
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "sale": {
      "id": "sale_001",
      "invoice_no": "WL-001-20241116-0001",
      "payment_method": "mpesa",
      "subtotal": 120000,
      "discount": 2000,
      "tax": 18880,
      "grand_total": 136880,
      "amount_paid": 140000,
      "change": 3120,
      "items": [...],
      "created_date": "2024-11-16T10:30:45.123Z"
    },
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
      "address": "123 Tech Plaza, Westlands, Nairobi",
      "phone": "+254 722 123 456",
      "email": "info@lunatech.co.ke",
      "kra_pin": "P051472913Q"
    }
  }
}
```

---

### 8. Approve Discount

Manager approval for discounts exceeding 10%.

```http
POST /pos/discount/approve
Content-Type: application/json
Authorization: Bearer <token>

{
  "salesId": "sale_001",
  "managerId": "manager_001",
  "managerPassword": "manager_password"
}
```

**Allowed Roles:** Manager, Admin

**Response (200 OK):**

```json
{
  "success": true,
  "message": "Discount approved successfully"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Codes

- `400` - Bad Request (validation error)
- `401` - Unauthorized (invalid/missing token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., duplicate invoice)
- `422` - Unprocessable Entity
- `500` - Internal Server Error

### Example Errors

**Insufficient Inventory:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Insufficient inventory for product: Dell Latitude 5420 in branch Westlands Branch"
  }
}
```

**Discount Approval Required:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Discounts over 10% require manager approval"
  }
}
```

**Invalid Manager Credentials:**

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid manager password"
  }
}
```

---

## Testing with cURL

### Search Product

```bash
curl -X POST http://localhost:5000/pos/products/search \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"search": "LAP-001"}'
```

### Create Sale

```bash
curl -X POST http://localhost:5000/pos/sales \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "branchId": "branch_001",
    "userId": "user_001",
    "payment_method": "cash",
    "amount_paid": 1200,
    "items": [{
      "productId": "prod_001",
      "quantity": 1,
      "unit_price": 1000,
      "tax_rate": 0.16
    }]
  }'
```

### Get Daily Summary

```bash
curl "http://localhost:5000/pos/daily-summary?branch_id=branch_001&date=2024-11-16" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Rate Limiting

- **Default:** 100 requests per 15 minutes per IP
- **Status:** 429 Too Many Requests
- **Headers:**
  - `RateLimit-Limit`: Maximum requests
  - `RateLimit-Remaining`: Remaining requests
  - `RateLimit-Reset`: Time until reset (seconds)

---

## Best Practices

1. **Always validate inventory** before displaying to user
2. **Use transactions** for all sale operations
3. **Check discount thresholds** before submitting
4. **Store receipts** for audit trail
5. **Implement retry logic** for network failures
6. **Cache product data** for faster search
7. **Log all manager approvals** for compliance
8. **Validate payment amounts** client-side
9. **Handle offline scenarios** gracefully
10. **Test ETR integration** in sandbox first

---

## Support

For issues or questions:

- Documentation: `/docs/POS_COMPLETE_GUIDE.md`
- API Docs: `http://localhost:5000/docs`
- Tests: `npm test`
