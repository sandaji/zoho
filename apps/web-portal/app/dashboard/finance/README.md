# Finance Dashboard - Coinest Style UI

## 🎨 Overview

This is a modern, production-ready Finance Dashboard implementing the **Coinest design system**. It provides real-time financial insights with a clean, professional interface.

![Dashboard Preview](./docs/preview.png)

---

## ✨ Features

### Core Functionality
- ✅ **Real-time Financial Summary** - Income, Expenses, Savings at a glance
- ✅ **Cashflow Visualization** - Monthly income vs expense bar charts
- ✅ **Expense Breakdown** - Category-wise donut chart with percentages
- ✅ **Recent Transactions** - Latest financial activity with category icons
- ✅ **Daily Spending Tracker** - Progress bar with limit warnings
- ✅ **Savings Goals** - Track multiple financial goals with progress bars
- ✅ **Responsive Design** - Works on desktop, tablet, and mobile

### Technical Features
- ✅ **Type-Safe** - Full TypeScript coverage
- ✅ **Error Handling** - Graceful fallbacks and error states
- ✅ **Loading States** - Smooth loading experience
- ✅ **Empty States** - Helpful messages when no data
- ✅ **Batch API Fetching** - Parallel data loading
- ✅ **Currency Formatting** - KES with compact notation

---

## 📁 Project Structure

```
frontend/app/dashboard/finance/
├── page.tsx                      # Main dashboard (PRODUCTION)
├── page-new.tsx                  # Alternative version (if needed)
│
├── components/                   # UI Components
│   ├── credit-card-widget.tsx    # Balance card with gradient
│   ├── cashflow-chart.tsx        # Recharts bar chart
│   ├── expense-donut-chart.tsx   # Recharts donut/ring chart
│   ├── recent-transactions.tsx   # Transaction list
│   ├── daily-limit-progress.tsx  # Spending progress bar
│   └── saving-plans.tsx          # Savings goals widget
│
├── types/                        # TypeScript Definitions
│   └── index.ts                  # All type definitions
│
├── lib/                          # Utilities
│   └── api.ts                    # API client functions
│
└── docs/                         # Documentation
    ├── API_REQUIREMENTS.md       # Backend API specifications
    ├── MIGRATION_GUIDE.md        # Deployment guide
    ├── TESTING_GUIDE.md          # QA checklist
    └── README.md                 # This file
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Access Dashboard
```
http://localhost:3000/dashboard/finance
```

---

## 🔌 API Integration

### Required Endpoints

The dashboard requires these API endpoints to function:

| Endpoint | Status | Description |
|----------|--------|-------------|
| `GET /v1/finance/summary` | ✅ Implemented | Financial overview stats |
| `GET /v1/finance/revenue-expense-chart` | ✅ Implemented | Monthly cashflow data |
| `GET /v1/finance/transactions` | 🆕 **NEEDS IMPLEMENTATION** | Recent transactions |
| `GET /v1/finance/expense-categories` | 🆕 **NEEDS IMPLEMENTATION** | Expense breakdown |
| `GET /v1/finance/daily-spending` | 🆕 **NEEDS IMPLEMENTATION** | Daily spending tracker |
| `GET /v1/finance/savings-goals` | 🆕 **NEEDS IMPLEMENTATION** | Savings goals |

See [`docs/API_REQUIREMENTS.md`](./docs/API_REQUIREMENTS.md) for detailed specifications.

### Using the API Client

```typescript
import { 
  fetchFinancialSummary,
  fetchTransactions,
  fetchAllDashboardData 
} from './lib/api';

// Fetch single endpoint
const summary = await fetchFinancialSummary();

// Fetch all data in parallel
const allData = await fetchAllDashboardData();
```

---

## 🎨 Design System

### Color Palette

```css
/* Primary Colors */
--primary-green: #104f38;      /* Deep emerald green */
--primary-lime: #cff07d;       /* Light lime accent */

/* Background Colors */
--bg-main: #f8f9fa;            /* Light gray background */
--bg-card: #ffffff;            /* White cards */

/* Status Colors */
--success: #10b981;            /* Green for income */
--danger: #ef4444;             /* Red for expenses */
--warning: #f59e0b;            /* Yellow for warnings */
--info: #3b82f6;               /* Blue for savings */
```

### Typography

```css
/* Font Family */
font-family: system-ui, -apple-system, "Segoe UI", sans-serif;

/* Font Sizes */
--text-3xl: 1.875rem;          /* Page title */
--text-2xl: 1.5rem;            /* Card titles */
--text-lg: 1.125rem;           /* Subheadings */
--text-base: 1rem;             /* Body text */
--text-sm: 0.875rem;           /* Small text */
--text-xs: 0.75rem;            /* Tiny text */
```

### Spacing

```css
/* Gap between elements */
--gap-6: 1.5rem;               /* Main grid gap */
--gap-4: 1rem;                 /* Card sections */
--gap-3: 0.75rem;              /* List items */
--gap-2: 0.5rem;               /* Small gaps */
```

---

## 🧩 Component Usage

### Credit Card Widget

```tsx
import { CreditCardWidget } from './components/credit-card-widget';

<CreditCardWidget
  balance={450000}
  holderName="Business Account"
  cardNumber="•••• •••• •••• 4291"
  expiryDate="12/26"
/>
```

### Cashflow Chart

```tsx
import { CashflowChart } from './components/cashflow-chart';

<CashflowChart
  data={[
    { name: "Jan", revenue: 120000, expenses: 80000 },
    { name: "Feb", revenue: 150000, expenses: 90000 },
  ]}
/>
```

### Recent Transactions

```tsx
import { RecentTransactions } from './components/recent-transactions';

<RecentTransactions
  transactions={[
    {
      id: "1",
      type: "expense",
      category: "food",
      amount: 12500,
      date: "2026-02-05T10:30:00Z",
      description: "Restaurant Supplies",
    },
  ]}
  onViewAll={() => console.log("View all clicked")}
/>
```

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

### Manual Testing
Follow the comprehensive checklist in [`docs/TESTING_GUIDE.md`](./docs/TESTING_GUIDE.md)

---

## 🛠️ Development

### Adding a New Component

1. Create component file in `components/`
2. Add TypeScript types to `types/index.ts`
3. Import and use in `page.tsx`
4. Update documentation

### Adding a New API Endpoint

1. Define types in `types/index.ts`
2. Add function to `lib/api.ts`
3. Call from `page.tsx`
4. Document in `docs/API_REQUIREMENTS.md`

### Customizing Colors

Edit Tailwind classes in components:
```tsx
// Change primary green
className="bg-[#104f38]"  // Old
className="bg-[#your-color]"  // New
```

---

## 📊 Performance

### Optimization Strategies

- ✅ **Parallel API Calls** - All endpoints fetched simultaneously
- ✅ **Lazy Loading** - Components load on demand
- ✅ **Memoization** - React.memo for expensive calculations
- ✅ **Code Splitting** - Automatic with Next.js App Router
- ✅ **Image Optimization** - Next.js Image component

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | TBD |
| Time to Interactive | < 3.0s | TBD |
| Lighthouse Score | > 90 | TBD |

---

## 🔒 Security

### Best Practices Implemented

- ✅ **No Hardcoded Secrets** - All sensitive data in env vars
- ✅ **HTTPS Only** - Enforced in production
- ✅ **XSS Prevention** - React escapes all user input
- ✅ **CSRF Protection** - API client includes tokens
- ✅ **Input Validation** - Zod schemas for all forms

---

## 🚢 Deployment

### Production Checklist

- [ ] All API endpoints implemented and tested
- [ ] Environment variables configured
- [ ] Build passes (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] Performance metrics meet targets
- [ ] Security scan clean
- [ ] Documentation up to date

### Deploy Commands

```bash
# Build production bundle
npm run build

# Start production server
npm start

# Deploy to Vercel (if using)
vercel --prod
```

---

## 📚 Documentation

- [`API_REQUIREMENTS.md`](./docs/API_REQUIREMENTS.md) - Backend API specifications
- [`MIGRATION_GUIDE.md`](./docs/MIGRATION_GUIDE.md) - Migration from old dashboard
- [`TESTING_GUIDE.md`](./docs/TESTING_GUIDE.md) - QA and testing procedures

---

## 🤝 Contributing

### Code Style

- Follow TypeScript strict mode
- Use functional components with hooks
- Keep components under 300 lines
- Add JSDoc comments for complex logic
- Use descriptive variable names

### Commit Messages

```
feat: Add daily spending tracker
fix: Resolve chart rendering issue
docs: Update API requirements
style: Format code with Prettier
refactor: Simplify transaction logic
test: Add unit tests for API client
```

---

## 🐛 Troubleshooting

### Common Issues

**Problem:** Charts not displaying
```
Solution: Ensure chartData is an array, even when empty
const [chartData, setChartData] = useState<ChartData[]>([]);
```

**Problem:** API calls return 404
```
Solution: Backend endpoints not implemented yet. 
Check docs/API_REQUIREMENTS.md and coordinate with backend team.
```

**Problem:** Type errors in components
```
Solution: Import types from types/index.ts
import type { Transaction } from '../types';
```

**Problem:** Slow page load
```
Solution: Check Network tab. API calls should be < 500ms.
If slow, optimize backend or add caching.
```

---

## 📞 Support

For questions or issues:

1. Check this README
2. Review documentation in `docs/`
3. Check browser console for errors
4. Contact the development team

---

## 📜 License

Copyright © 2026 Zoho ERP. All rights reserved.

---

## 🎉 Changelog

### v2.0.0 (2026-02-07)
- ✨ Complete redesign with Coinest UI
- ✨ New component architecture
- ✨ TypeScript type system
- ✨ Improved error handling
- ✨ Better mobile responsiveness
- 📚 Comprehensive documentation

### v1.0.0 (Original)
- Basic dashboard with charts
- Tab-based navigation
- Simple data display

---

**Built with ❤️ by the Zoho ERP Team**
