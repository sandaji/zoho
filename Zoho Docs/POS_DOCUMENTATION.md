# Commercial-Grade POS System Documentation

## Overview
This is a fully integrated Point of Sale (POS) system that combines sales document management with retail transaction processing. The system supports draft documents, quotes, invoices, credit notes, and real-time POS sales.

## Features

### 🛒 Core POS Features
- **Product Search & Selection**: Real-time autocomplete product search
- **Shopping Cart Management**: Add, remove, update quantities, apply discounts
- **Multiple Payment Methods**: Cash, Card, M-Pesa, Cheque, Bank Transfer
- **Real-time Calculations**: Automatic subtotal, tax, discount, and total calculations
- **Customer Information**: Optional customer name and phone capture
- **Sale Notes**: Add transaction notes for reference
- **Keyboard Shortcuts**: 
  - `F9`: Complete sale
  - `F4`: Clear cart
  - `ESC`: Focus search

### 📄 Sales Document Management
- **Document Types**: Draft, Quote, Invoice, Credit Note
- **Document Conversion**: Convert quotes to invoices seamlessly
- **Sequential Numbering**: Automatic document number generation per branch
- **Status Tracking**: Draft, Sent, Converted, Paid, Unpaid, Void

### 💰 Payment Processing
- **Quick Amount Selection**: Pre-set amount buttons for fast cash transactions
- **Change Calculator**: Automatic change calculation for cash payments
- **Payment Recording**: Automatic payment records linked to invoices
- **Multiple Payment Support**: Record partial and full payments

### 📊 Sales History & Reporting
- **Transaction History**: View all completed sales
- **Advanced Filtering**: Filter by date range, payment method
- **Search Functionality**: Search by invoice number or customer name
- **Sales Analytics**: Total sales count, revenue, average sale value
- **Receipt Printing**: Thermal and A4 receipt formats

### 📦 Inventory Integration
- **Real-time Stock Tracking**: Automatic inventory deduction on sale
- **Stock Availability Check**: Prevents overselling
- **Inventory Transactions**: Complete audit trail of stock movements

## Architecture

### Frontend Components

#### Main Page Component
**File**: `frontend/app/dashboard/pos/page.tsx`

The main POS interface with three tabs:
- **New Sale**: Primary POS transaction interface
- **History**: View past sales
- **Reports**: Sales analytics (coming soon)

Key State Management:
```typescript
- cart: CartItem[]           // Shopping cart items
- paymentMethod: string      // Selected payment method
- amountTendered: number     // Cash amount provided
- customerInfo: object       // Optional customer details
```

#### POS Components

##### 1. POSCart (`components/pos/POSCart.tsx`)
- Displays cart items in a table format
- Quantity adjustment with +/- buttons
- Individual item discount application
- Remove items from cart
- Clear entire cart

##### 2. POSPayment (`components/pos/POSPayment.tsx`)
- Payment method selection with icons
- Amount tendered input for cash payments
- Quick amount buttons (Exact, 1000, 2000, 5000)
- Change calculation and display
- Order summary with subtotal, tax, discounts
- Customer information capture
- Sale notes input
- Complete sale button

##### 3. POSSaleSuccess (`components/pos/POSSaleSuccess.tsx`)
- Success modal after sale completion
- Receipt preview
- Print receipt functionality
- Email receipt (coming soon)
- Download PDF (coming soon)
- New sale button to start next transaction

##### 4. POSHistory (`components/pos/POSHistory.tsx`)
- Sales transaction list with pagination
- Date range filters (Today, Yesterday, Week, Month, All)
- Payment method filters
- Search by invoice or customer
- Sales summary cards
- View and print individual receipts

##### 5. POSCashier (`components/pos/POSCashier.tsx`)
- Cashier information display
- Current session details
- Real-time clock
- Branch information

##### 6. POSQuickActions (`components/pos/POSQuickActions.tsx`)
- Park sale (coming soon)
- Hold sale (coming soon)
- Clear cart
- Additional quick actions menu

### Backend Services

#### Sales Controller
**File**: `backend/src/modules/sales/sales.controller.ts`

Endpoints:
- `POST /api/sales/documents` - Create sales document
- `GET /api/sales/documents` - List documents with filters
- `GET /api/sales/documents/:id` - Get single document
- `POST /api/sales/documents/:id/convert` - Convert document type
- `POST /api/sales/documents/:id/void` - Void a document
- `POST /api/sales/pos/sales` - Create POS sale
- `GET /api/sales/pos/sales` - Get sales history
- `GET /api/sales/pos/sales/:id` - Get single sale

#### Sales Service
**File**: `backend/src/modules/sales/sales.service.ts`

Core Business Logic:
- Document creation with auto-numbering
- Document type conversion (Quote → Invoice)
- POS sale processing
- Inventory transaction recording
- Payment recording
- Credit note creation

#### Sequence Service
**File**: `backend/src/modules/sequences/sequence.service.ts`

Generates unique, sequential document numbers:
- Format: `{PREFIX}-{NUMBER}` (e.g., INV-0001)
- Thread-safe with serializable transactions
- Per-branch sequence tracking
- Prefixes: DRF, QTN, INV, CRN

## Data Flow

### POS Sale Transaction Flow

```
1. User adds products to cart
   └─> Cart state updated with product details

2. User adjusts quantities/discounts
   └─> Totals recalculated in real-time

3. User enters customer info (optional)
   └─> Customer data stored in component state

4. User selects payment method
   └─> Payment UI adapts (cash shows tender/change)

5. User clicks "Complete Sale"
   └─> Validation checks (cart not empty, sufficient payment)
   └─> POST request to /api/sales/pos/sales
   
6. Backend processes sale
   ├─> Generate invoice number (SequenceService)
   ├─> Create sales document (INVOICE, PAID status)
   ├─> Create document items
   ├─> Record payment
   ├─> Create inventory transactions
   └─> Update product quantities

7. Success response returned
   └─> Success modal displayed
   └─> Receipt ready for printing
   └─> Option to start new sale
```

## Database Schema

### Key Tables

#### sales_documents
```sql
- id: UUID
- documentId: String (e.g., INV-0001)
- type: ENUM (DRAFT, QUOTE, INVOICE, CREDIT_NOTE)
- status: ENUM (DRAFT, SENT, CONVERTED, PAID, UNPAID, VOID)
- branchId: UUID
- userId: UUID
- customerId: UUID (nullable)
- customerName: String (nullable)
- customerPhone: String (nullable)
- issueDate: DateTime
- dueDate: DateTime (nullable)
- subtotal: Decimal
- tax: Decimal
- discount: Decimal
- total: Decimal
- notes: Text
- sourceDocumentId: UUID (nullable)
- createdAt: DateTime
- updatedAt: DateTime
```

#### sales_document_items
```sql
- id: UUID
- documentId: UUID
- productId: UUID
- quantity: Decimal
- unitPrice: Decimal
- taxRate: Decimal
- discount: Decimal
- total: Decimal
```

#### payments
```sql
- id: UUID
- documentId: UUID
- amount: Decimal
- paymentMethod: ENUM
- reference: String
- paymentDate: DateTime
- userId: UUID
```

#### inventory_transactions
```sql
- id: UUID
- productId: UUID
- branchId: UUID
- type: ENUM (SALE, PURCHASE, ADJUSTMENT)
- quantity: Decimal (negative for sales)
- referenceId: UUID
- referenceType: String
- userId: UUID
- createdAt: DateTime
```

#### document_sequences
```sql
- id: UUID
- branchId: UUID
- type: ENUM (DRAFT, QUOTE, INVOICE, CREDIT_NOTE)
- prefix: String
- nextNumber: Int
- updatedAt: DateTime
```

## API Reference

### Create POS Sale
```http
POST /api/sales/pos/sales
Content-Type: application/json
Authorization: Bearer {token}

{
  "branchId": "uuid",
  "userId": "uuid",
  "items": [
    {
      "productId": "uuid",
      "quantity": 2,
      "unit_price": 100.00,
      "tax_rate": 0.16,
      "discount": 10.00
    }
  ],
  "payment_method": "cash",
  "amount_paid": 200.00,
  "customer_name": "John Doe",
  "customer_phone": "+254712345678",
  "notes": "Customer requested receipt"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_no": "INV-0001",
    "subtotal": 190.00,
    "tax": 30.40,
    "total": 220.40,
    "payment_method": "cash",
    "amount_paid": 200.00,
    "items": [...],
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Sale completed successfully"
}
```

### Get Sales History
```http
GET /api/sales/pos/sales?date=today&payment_method=cash&limit=50
Authorization: Bearer {token}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
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

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- npm or yarn

### Backend Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Configure environment variables:
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
JWT_SECRET="your-secret-key"
```

3. Run migrations:
```bash
npx prisma migrate dev
```

4. Start server:
```bash
npm run dev
```

### Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure API endpoint:
```typescript
// lib/api-config.ts
export const API_BASE_URL = "http://localhost:3001/api";
```

3. Start development server:
```bash
npm run dev
```

4. Access POS at: `http://localhost:3000/dashboard/pos`

## Configuration

### Tax Rates
Default tax rate is 16% (VAT). Can be configured per product or modified in:
- Frontend: `CartItem.tax_rate` (default 0.16)
- Backend: Product table `tax_rate` column

### Payment Methods
Configured in both frontend and backend:
```typescript
type PaymentMethod = "cash" | "card" | "mpesa" | "cheque" | "bank_transfer";
```

### Receipt Branding
Customize in `components/pos/POSSaleSuccess.tsx`:
```typescript
const company = {
  name: 'Your Company Name',
  address: '123 Business Street',
  phone: '+254 XXX XXX XXX',
  email: 'info@company.com',
  vat: 'XXXXXXXXXX'
};
```

## Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **Role-Based Access**: Different permissions for admin, manager, cashier
- **Transaction Atomicity**: Database transactions ensure data consistency
- **Inventory Validation**: Prevents overselling with stock checks
- **Audit Trail**: Complete record of all transactions and modifications

## Best Practices

### Performance
- Product search uses debouncing (300ms delay)
- Sales history uses pagination
- Database indexes on frequently queried fields
- Optimistic UI updates for better UX

### Error Handling
- User-friendly error messages
- Toast notifications for all actions
- Backend validation with Zod schemas
- Transaction rollback on errors

### Testing
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Troubleshooting

### Common Issues

**Issue**: Products not appearing in search
- **Solution**: Check product status is 'active' and quantity > 0

**Issue**: Sale fails with "Insufficient inventory"
- **Solution**: Verify product stock levels in inventory

**Issue**: Invoice numbers not sequential
- **Solution**: Check document_sequences table for branch

**Issue**: Payment not recorded
- **Solution**: Verify payment method is valid enum value

## Future Enhancements

- [ ] Park/Hold sales for later completion
- [ ] Customer loyalty points system
- [ ] Barcode scanner integration
- [ ] Receipt email functionality
- [ ] PDF download for receipts
- [ ] Advanced reporting dashboard
- [ ] Multi-currency support
- [ ] Returns and refunds processing
- [ ] Shift management and cash drawer
- [ ] Offline mode with sync

## Support

For issues or questions:
- Create an issue in the repository
- Contact: support@yourcompany.com
- Documentation: https://docs.yourcompany.com

## License

Proprietary - All rights reserved
