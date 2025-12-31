# Quick Start Guide - POS System

## 🚀 Quick Setup (5 minutes)

### Prerequisites Check
```bash
node --version  # Should be 18+
psql --version  # Should be 14+
```

### 1. Backend Setup (2 minutes)

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://user:password@localhost:5432/zoho_db"
JWT_SECRET="your-super-secret-key-change-this"
PORT=3001
EOF

# Run database migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start backend
npm run dev
```

Backend should now be running on `http://localhost:3001`

### 2. Frontend Setup (2 minutes)

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:3001/api
EOF

# Start frontend
npm run dev
```

Frontend should now be running on `http://localhost:3000`

### 3. Access POS (1 minute)

1. Open browser: `http://localhost:3000`
2. Login with credentials (or register if first time)
3. Navigate to: `Dashboard > POS`
4. Start selling! 🎉

## 📋 Verify Installation

### Test Backend API
```bash
# Health check
curl http://localhost:3001/health

# Should return: {"status": "ok"}
```

### Test Database Connection
```bash
cd backend
npx prisma studio
```
This opens a web UI to view your database.

## 🎓 First Sale Tutorial

### Step 1: Add Products
1. Click the search bar (or press ESC)
2. Type product name or SKU
3. Select product from dropdown
4. Product appears in cart

### Step 2: Adjust Cart
- Click **+/-** buttons to change quantity
- Click **discount** to apply item discount
- Click **trash** icon to remove item

### Step 3: Complete Sale
1. Select payment method (default: Cash)
2. For cash: Enter amount tendered
3. See change calculated automatically
4. Click **"Complete Sale"** or press **F9**

### Step 4: Print Receipt
1. Success modal appears
2. Click **"Print Receipt"**
3. Choose thermal or A4 format
4. Click **"New Sale"** to continue

## 🔑 Default Login Credentials

```
Email: admin@zoho.com
Password: admin123

OR

Email: cashier@zoho.com  
Password: cashier123
```

**⚠️ Change these in production!**

## 📱 Mobile Testing

The POS works on tablets! Test with:
```bash
# Find your local IP
ipconfig  # Windows
ifconfig  # Mac/Linux

# Access from tablet/phone
http://YOUR_IP:3000/dashboard/pos
```

## 🛠️ Common Issues & Fixes

### Issue: "Cannot connect to database"
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list  # Mac

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Issue: "Port 3000 already in use"
```bash
# Kill process on port 3000
npx kill-port 3000

# Or use different port
npm run dev -- -p 3001
```

### Issue: "Products not showing in search"
```sql
-- Check products exist
SELECT * FROM products LIMIT 5;

-- Check products have quantity
UPDATE products SET quantity = 100 WHERE quantity = 0;
```

### Issue: "JWT token invalid"
```bash
# Clear browser localStorage
# Then login again
```

## 📊 Test Data Setup

### Add Test Products
```sql
INSERT INTO products (name, sku, unit_price, quantity, status) VALUES
('Coca Cola 500ml', 'COKE-500', 50, 100, 'active'),
('Bread - White', 'BREAD-WHITE', 45, 50, 'active'),
('Milk 1L', 'MILK-1L', 120, 75, 'active');
```

### Add Test Branch
```sql
INSERT INTO branches (name, code, status) VALUES
('Main Branch', 'MAIN', 'active');
```

### Add Test User
```sql
INSERT INTO users (name, email, password, role, branch_id) VALUES
('Test Cashier', 'test@zoho.com', 'hashed_password', 'cashier', 'branch_id_here');
```

## 📖 Next Steps

1. **Customize Branding**: Edit `POSSaleSuccess.tsx` with your company info
2. **Configure Tax Rates**: Update default tax rate in cart initialization
3. **Add More Products**: Use admin panel or import CSV
4. **Setup Printers**: Configure thermal printer for receipts
5. **Train Staff**: Show them F9 (complete) and F4 (clear) shortcuts

## 🎯 Key Features to Try

- [ ] Complete a cash sale with change
- [ ] Apply discount to an item
- [ ] Process card payment
- [ ] Add customer information
- [ ] View sales history
- [ ] Filter by date range
- [ ] Print a receipt
- [ ] Use keyboard shortcuts

## 📞 Support

- **Documentation**: See `POS_DOCUMENTATION.md`
- **Integration Details**: See `INTEGRATION_SUMMARY.md`
- **API Reference**: Check backend routes in `sales.routes.ts`

## 🎉 You're Ready!

Your POS system is now fully operational. Start processing sales!

**Keyboard Shortcuts**:
- `F9` - Complete Sale
- `F4` - Clear Cart  
- `ESC` - Focus Search

**Happy Selling! 💰**
