# API Testing Guide & Examples

## 🧪 Testing the POS API

### Prerequisites
- Backend running on `http://localhost:3001`
- Valid JWT token (get from login)
- API testing tool (Postman, Insomnia, or curl)

## 🔐 Authentication

### 1. Login to Get Token
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cashier@zoho.com",
    "password": "cashier123"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "name": "Cashier",
      "email": "cashier@zoho.com",
      "role": "cashier",
      "branchId": "branch-uuid"
    }
  }
}
```

**Save the token** - use it in all subsequent requests.

## 📝 POS Sales Endpoints

### 2. Create a POS Sale

```bash
curl -X POST http://localhost:3001/api/sales/pos/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "branchId": "branch-uuid",
    "userId": "user-uuid",
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 2,
        "unit_price": 100.00,
        "tax_rate": 0.16,
        "discount": 10.00,
        "discount_percent": 5
      },
      {
        "productId": "product-uuid-2",
        "quantity": 1,
        "unit_price": 50.00,
        "tax_rate": 0.16,
        "discount": 0,
        "discount_percent": 0
      }
    ],
    "payment_method": "cash",
    "amount_paid": 250.00,
    "discount": 10.00,
    "customer_name": "John Doe",
    "customer_phone": "+254712345678",
    "notes": "Customer requested extra bag"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sale-uuid",
    "invoice_no": "INV-0001",
    "subtotal": 190.00,
    "tax": 30.40,
    "total": 220.40,
    "payment_method": "cash",
    "amount_paid": 250.00,
    "items": [
      {
        "id": "item-uuid-1",
        "productId": "product-uuid-1",
        "quantity": 2,
        "unitPrice": 100.00,
        "discount": 10.00,
        "total": 190.00,
        "product": {
          "name": "Product 1",
          "sku": "PROD-001"
        }
      }
    ],
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Sale completed successfully"
}
```

### 3. Get Sales History

```bash
# All sales today
curl -X GET "http://localhost:3001/api/sales/pos/sales?date=today" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Filter by payment method
curl -X GET "http://localhost:3001/api/sales/pos/sales?date=week&payment_method=cash" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# With pagination
curl -X GET "http://localhost:3001/api/sales/pos/sales?limit=20&offset=0" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "sale-uuid",
      "invoice_no": "INV-0001",
      "total": 220.40,
      "payment_method": "cash",
      "created_at": "2024-01-15T10:30:00Z",
      "customer_name": "John Doe",
      "items_count": 3,
      "status": "PAID"
    }
  ]
}
```

### 4. Get Single Sale

```bash
curl -X GET http://localhost:3001/api/sales/pos/sales/SALE_UUID \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sale-uuid",
    "invoice_no": "INV-0001",
    "subtotal": 190.00,
    "tax": 30.40,
    "total": 220.40,
    "payment_method": "cash",
    "amount_paid": 250.00,
    "items": [...],
    "created_at": "2024-01-15T10:30:00Z",
    "customer": {
      "name": "John Doe",
      "phone": "+254712345678"
    },
    "cashier": {
      "name": "Cashier Name",
      "email": "cashier@zoho.com"
    }
  }
}
```

## 📄 Sales Document Endpoints

### 5. Create Sales Document (Quote/Invoice/Draft)

```bash
curl -X POST http://localhost:3001/api/sales/documents \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "type": "QUOTE",
    "status": "DRAFT",
    "customerId": "customer-uuid",
    "issueDate": "2024-01-15",
    "dueDate": "2024-01-30",
    "items": [
      {
        "productId": "product-uuid",
        "quantity": 5,
        "unitPrice": 100.00,
        "taxRate": 0.16,
        "discount": 50.00,
        "total": 450.00
      }
    ],
    "subtotal": 450.00,
    "tax": 72.00,
    "discount": 50.00,
    "total": 522.00,
    "notes": "Quote valid for 30 days"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "document-uuid",
    "documentId": "QTN-0001",
    "type": "QUOTE",
    "status": "DRAFT",
    "total": 522.00,
    "items": [...],
    "customer": {...}
  }
}
```

### 6. Convert Quote to Invoice

```bash
curl -X POST http://localhost:3001/api/sales/documents/QUOTE_UUID/convert \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "type": "INVOICE"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "new-document-uuid",
    "documentId": "INV-0002",
    "type": "INVOICE",
    "status": "UNPAID",
    "sourceDocumentId": "quote-uuid",
    "total": 522.00
  }
}
```

### 7. List Documents with Filters

```bash
# All invoices
curl -X GET "http://localhost:3001/api/sales/documents?type=INVOICE" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Paid invoices
curl -X GET "http://localhost:3001/api/sales/documents?type=INVOICE&status=PAID" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Documents for specific customer
curl -X GET "http://localhost:3001/api/sales/documents?customerId=customer-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# Date range
curl -X GET "http://localhost:3001/api/sales/documents?startDate=2024-01-01&endDate=2024-01-31" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 8. Record Payment

```bash
curl -X POST http://localhost:3001/api/sales/documents/INVOICE_UUID/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "amount": 500.00,
    "payment_method": "mpesa",
    "reference": "ABC123XYZ"
  }'
```

### 9. Void Document

```bash
curl -X POST http://localhost:3001/api/sales/documents/DOCUMENT_UUID/void \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "reason": "Customer requested cancellation"
  }'
```

### 10. Create Credit Note

```bash
curl -X POST http://localhost:3001/api/sales/invoices/INVOICE_UUID/credit-notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "items": [
      {
        "productId": "product-uuid",
        "quantity": 1,
        "unitPrice": 100.00,
        "taxRate": 0.16,
        "discount": 0,
        "total": 100.00
      }
    ],
    "reason": "Defective product returned"
  }'
```

## 🧪 Testing Scenarios

### Scenario 1: Complete Cash Sale

```javascript
// Step 1: Login
const loginRes = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'cashier@zoho.com',
    password: 'cashier123'
  })
});
const { data: { token } } = await loginRes.json();

// Step 2: Create sale
const saleRes = await fetch('http://localhost:3001/api/sales/pos/sales', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    branchId: 'branch-uuid',
    userId: 'user-uuid',
    items: [
      {
        productId: 'product-uuid',
        quantity: 2,
        unit_price: 50.00,
        tax_rate: 0.16,
        discount: 0,
        discount_percent: 0
      }
    ],
    payment_method: 'cash',
    amount_paid: 120.00
  })
});

const sale = await saleRes.json();
console.log('Sale created:', sale.data.invoice_no);
```

### Scenario 2: Quote to Invoice Flow

```javascript
// Step 1: Create quote
const quoteRes = await fetch('http://localhost:3001/api/sales/documents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'QUOTE',
    customerId: 'customer-uuid',
    issueDate: new Date().toISOString(),
    items: [...],
    subtotal: 1000,
    tax: 160,
    total: 1160
  })
});

const quote = await quoteRes.json();

// Step 2: Convert to invoice
const invoiceRes = await fetch(
  `http://localhost:3001/api/sales/documents/${quote.data.id}/convert`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ type: 'INVOICE' })
  }
);

const invoice = await invoiceRes.json();
console.log('Invoice created:', invoice.data.documentId);
```

### Scenario 3: Partial Payment

```javascript
// Invoice total: 1000

// First payment
await fetch(`http://localhost:3001/api/sales/documents/${invoiceId}/payments`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    amount: 500,
    payment_method: 'cash'
  })
});

// Second payment (completes the invoice)
await fetch(`http://localhost:3001/api/sales/documents/${invoiceId}/payments`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    amount: 500,
    payment_method: 'mpesa',
    reference: 'MPE123456'
  })
});

// Invoice status automatically updated to PAID
```

## 🐛 Error Responses

### 400 Bad Request - Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "items",
      "message": "At least one item is required"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Document not found"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "An error occurred processing your request"
}
```

## 📊 Postman Collection

Import this collection for easy testing:

```json
{
  "info": {
    "name": "POS System API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{auth_token}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "Auth",
      "item": [
        {
          "name": "Login",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"cashier@zoho.com\",\n  \"password\": \"cashier123\"\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/auth/login",
              "host": ["{{base_url}}"],
              "path": ["auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "POS Sales",
      "item": [
        {
          "name": "Create Sale",
          "request": {
            "method": "POST",
            "header": [],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"branchId\": \"{{branch_id}}\",\n  \"userId\": \"{{user_id}}\",\n  \"items\": [\n    {\n      \"productId\": \"{{product_id}}\",\n      \"quantity\": 2,\n      \"unit_price\": 100,\n      \"tax_rate\": 0.16,\n      \"discount\": 0\n    }\n  ],\n  \"payment_method\": \"cash\",\n  \"amount_paid\": 250\n}",
              "options": {
                "raw": {
                  "language": "json"
                }
              }
            },
            "url": {
              "raw": "{{base_url}}/sales/pos/sales",
              "host": ["{{base_url}}"],
              "path": ["sales", "pos", "sales"]
            }
          }
        },
        {
          "name": "Get Sales History",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{base_url}}/sales/pos/sales?date=today",
              "host": ["{{base_url}}"],
              "path": ["sales", "pos", "sales"],
              "query": [
                {
                  "key": "date",
                  "value": "today"
                }
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "base_url",
      "value": "http://localhost:3001/api"
    },
    {
      "key": "auth_token",
      "value": ""
    },
    {
      "key": "branch_id",
      "value": ""
    },
    {
      "key": "user_id",
      "value": ""
    },
    {
      "key": "product_id",
      "value": ""
    }
  ]
}
```

## ✅ Testing Checklist

### Basic Functionality
- [ ] Login successfully
- [ ] Create a cash sale
- [ ] Create a card sale
- [ ] Create sale with discount
- [ ] Create sale with customer info
- [ ] View sales history
- [ ] Filter sales by date
- [ ] Filter sales by payment method
- [ ] View single sale details

### Document Management
- [ ] Create draft document
- [ ] Create quote
- [ ] Convert quote to invoice
- [ ] List documents with filters
- [ ] Record payment on invoice
- [ ] Void a document
- [ ] Create credit note

### Edge Cases
- [ ] Attempt sale with insufficient stock
- [ ] Attempt sale with invalid product
- [ ] Attempt sale without authentication
- [ ] Attempt unauthorized action (wrong role)
- [ ] Create sale with zero items (should fail)
- [ ] Create sale with negative quantity (should fail)
- [ ] Record payment exceeding invoice total

### Performance
- [ ] Load 100+ sales in history
- [ ] Create sale with 50+ line items
- [ ] Concurrent sales from multiple users
- [ ] Database transaction rollback on error

---

**Happy Testing! 🚀**
