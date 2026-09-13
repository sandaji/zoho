# Finance Dashboard Testing Guide

## 🧪 Testing Checklist

Use this guide to thoroughly test the new Finance Dashboard before deploying to production.

---

## Prerequisites

- [ ] Backend API endpoints are implemented (see `API_REQUIREMENTS.md`)
- [ ] Development environment is running (`npm run dev`)
- [ ] You have access to test data or can create test transactions
- [ ] Browser DevTools are open (F12) for monitoring network requests

---

## 1. Visual Testing

### Layout & Responsiveness

- [ ] **Desktop (1920x1080)**
  - [ ] All widgets are visible and properly aligned
  - [ ] Grid layout shows 8:4 column ratio (left:right)
  - [ ] No horizontal scrolling
  - [ ] All text is readable

- [ ] **Tablet (768px)**
  - [ ] Grid stacks to single column
  - [ ] Cards are full width
  - [ ] Navigation dropdown is accessible
  - [ ] Charts scale properly

- [ ] **Mobile (375px)**
  - [ ] All content is accessible
  - [ ] Buttons are touch-friendly (min 44x44px)
  - [ ] Text doesn't overflow
  - [ ] Charts are readable

### Design Fidelity (Coinest Style)

- [ ] **Credit Card Widget**
  - [ ] Deep green gradient background (#104f38)
  - [ ] White text is readable
  - [ ] Visa logo/text is visible
  - [ ] Balance displays correctly
  - [ ] Card number is masked (•••• •••• •••• 4291)
  - [ ] Lime accent strip at bottom (#cff07d)

- [ ] **Top Stat Cards**
  - [ ] All three cards visible (Income, Expense, Savings)
  - [ ] Icons have colored backgrounds (green, red, blue)
  - [ ] Numbers format correctly (compact notation)
  - [ ] Secondary text is gray and smaller

- [ ] **Cashflow Chart**
  - [ ] Bar chart with rounded tops
  - [ ] Dark green bars (Income) and lime bars (Expense)
  - [ ] X-axis shows month names
  - [ ] Y-axis shows currency values
  - [ ] Tooltip appears on hover
  - [ ] Legend is visible

- [ ] **Expense Donut Chart**
  - [ ] Ring chart (not full pie)
  - [ ] Center shows total expense
  - [ ] Legend below chart with categories
  - [ ] Colors match Coinest palette
  - [ ] Percentages shown in legend

- [ ] **Recent Transactions**
  - [ ] Transactions in reverse chronological order
  - [ ] Category icons display correctly
  - [ ] Income shows green (+), expense shows red (-)
  - [ ] Dates format properly
  - [ ] "View All" button works

- [ ] **Daily Limit Progress**
  - [ ] Progress bar fills correctly
  - [ ] Color changes based on usage:
    - Green when < 80%
    - Yellow when 80-100%
    - Red when > 100%
  - [ ] Warning messages appear when appropriate

- [ ] **Savings Goals**
  - [ ] Each goal shows progress bar
  - [ ] Percentage is accurate
  - [ ] "Add Goal" button visible
  - [ ] Empty state shows when no goals

---

## 2. Functional Testing

### Data Loading

- [ ] **Initial Page Load**
  - [ ] Loading spinner appears
  - [ ] "Loading dashboard..." message shows
  - [ ] Page loads within 3 seconds
  - [ ] All data appears correctly

- [ ] **Refresh Button**
  - [ ] Spinner icon animates when clicked
  - [ ] Button is disabled during refresh
  - [ ] Data updates after refresh
  - [ ] No console errors

- [ ] **Error Handling**
  - [ ] Graceful error messages appear if API fails
  - [ ] Other components still work if one API fails
  - [ ] Error alert is dismissible
  - [ ] Retry option available

### Navigation

- [ ] **Dropdown Menu**
  - [ ] Clicking opens menu
  - [ ] All 6 options visible:
    - Dashboard
    - Payments
    - Transactions
    - Invoices
    - Cards
    - Savings
  - [ ] Icons display correctly
  - [ ] Selected item updates in button
  - [ ] Menu closes after selection

### Interactive Elements

- [ ] **Export Button**
  - [ ] Button is clickable
  - [ ] Download functionality works (if implemented)
  - [ ] Button shows loading state during export

- [ ] **"View All" Buttons**
  - [ ] Clicking navigates to correct section
  - [ ] Or opens modal (depending on implementation)

- [ ] **"Add Goal" Button**
  - [ ] Opens goal creation modal/form
  - [ ] Form validation works
  - [ ] New goal appears after creation

---

## 3. API Integration Testing

### API Calls

Monitor Network tab (F12 → Network) and verify:

- [ ] **Financial Summary**
  ```
  GET /v1/finance/summary
  Status: 200 OK
  Response time: < 500ms
  ```

- [ ] **Chart Data**
  ```
  GET /v1/finance/revenue-expense-chart
  Status: 200 OK
  Response time: < 500ms
  ```

- [ ] **Transactions**
  ```
  GET /v1/finance/transactions?limit=5
  Status: 200 OK
  Response time: < 300ms
  ```

- [ ] **Expense Categories**
  ```
  GET /v1/finance/expense-categories?period=month
  Status: 200 OK
  Response time: < 300ms
  ```

- [ ] **Daily Spending**
  ```
  GET /v1/finance/daily-spending
  Status: 200 OK
  Response time: < 200ms
  ```

- [ ] **Savings Goals**
  ```
  GET /v1/finance/savings-goals?status=active
  Status: 200 OK
  Response time: < 300ms
  ```

### Data Validation

- [ ] **Numbers Format Correctly**
  - [ ] Currency displays as KES (not USD)
  - [ ] Large numbers use compact notation (e.g., "KES 1.2M")
  - [ ] Decimals round appropriately
  - [ ] No negative signs for absolute values

- [ ] **Dates Format Correctly**
  - [ ] Transactions show "Feb 5" format
  - [ ] Deadlines show "Dec 31, 2026" format
  - [ ] All dates in local timezone

- [ ] **Percentages Calculate Correctly**
  - [ ] Expense categories sum to 100%
  - [ ] Savings goals show accurate progress
  - [ ] Margins calculate properly

---

## 4. Performance Testing

### Loading Speed

- [ ] **Cold Load (first visit)**
  - Time from page load to data display: _______ ms
  - Target: < 2000ms

- [ ] **Warm Load (cached)**
  - Time from page load to data display: _______ ms
  - Target: < 1000ms

- [ ] **API Response Times**
  - All APIs respond in < 500ms
  - Batch fetch completes in < 1000ms

### Browser Performance

- [ ] **Chrome DevTools → Performance**
  - [ ] No long tasks (> 50ms)
  - [ ] Smooth animations (60fps)
  - [ ] Memory usage stable

- [ ] **Lighthouse Score**
  - [ ] Performance: > 90
  - [ ] Accessibility: > 90
  - [ ] Best Practices: > 90

---

## 5. Browser Compatibility

Test in the following browsers:

- [ ] **Chrome/Edge** (latest)
  - [ ] All features work
  - [ ] Charts render correctly
  - [ ] No console errors

- [ ] **Firefox** (latest)
  - [ ] All features work
  - [ ] Charts render correctly
  - [ ] No console errors

- [ ] **Safari** (latest)
  - [ ] All features work
  - [ ] Charts render correctly
  - [ ] No console errors

- [ ] **Mobile Safari** (iOS)
  - [ ] Touch interactions work
  - [ ] No horizontal scroll
  - [ ] Text is readable

- [ ] **Mobile Chrome** (Android)
  - [ ] Touch interactions work
  - [ ] No horizontal scroll
  - [ ] Text is readable

---

## 6. Error Scenarios

### Simulate Failures

- [ ] **No Internet Connection**
  - [ ] Offline indicator appears
  - [ ] Retry button available
  - [ ] Cached data shows (if available)

- [ ] **API Returns 500 Error**
  - [ ] Error message displays
  - [ ] Other components still work
  - [ ] Console shows detailed error

- [ ] **API Returns Empty Data**
  - [ ] Empty states show correctly
  - [ ] No "undefined" or "null" in UI
  - [ ] Helpful messages guide user

- [ ] **API Timeout**
  - [ ] Loading spinner disappears after timeout
  - [ ] Error message appears
  - [ ] Retry option available

---

## 7. Accessibility Testing

### Keyboard Navigation

- [ ] **Tab Order**
  - [ ] Logical tab order through all interactive elements
  - [ ] No keyboard traps
  - [ ] Focus indicator visible

- [ ] **Keyboard Shortcuts**
  - [ ] Enter activates buttons
  - [ ] Escape closes dropdowns
  - [ ] Arrow keys navigate menus

### Screen Readers

- [ ] **VoiceOver (Mac) / NVDA (Windows)**
  - [ ] All interactive elements announced
  - [ ] Chart data is accessible
  - [ ] Error messages are read aloud
  - [ ] Loading states announced

### Color Contrast

- [ ] **WCAG AA Compliance**
  - [ ] Text has 4.5:1 contrast ratio
  - [ ] Interactive elements have 3:1 contrast
  - [ ] Use browser extension to verify

---

## 8. Data Accuracy Testing

### Financial Calculations

- [ ] **Summary Card Math**
  ```
  Income: KES 1,000,000
  Expense: KES 700,000
  Savings: KES 300,000 ✓ (Income - Expense)
  ```

- [ ] **Expense Percentages**
  ```
  Operating: 40% = KES 400,000
  Payroll: 30% = KES 300,000
  Total: 100% = KES 1,000,000 ✓
  ```

- [ ] **Savings Goal Progress**
  ```
  Current: KES 450,000
  Target: KES 1,000,000
  Progress: 45% ✓ (450,000 / 1,000,000 * 100)
  ```

### Transaction Logic

- [ ] Income transactions show positive (green)
- [ ] Expense transactions show negative (red)
- [ ] Recent transactions sorted by date (newest first)
- [ ] Transaction categories match API values

---

## 9. User Experience Testing

### Usability

- [ ] **First Impression**
  - Dashboard looks professional
  - Information hierarchy is clear
  - Colors are pleasant and not overwhelming

- [ ] **Information Density**
  - Not too cluttered
  - Not too sparse
  - Important metrics prominent

- [ ] **Call-to-Actions**
  - "Refresh" button obvious
  - "Export" button visible
  - "Add Goal" button accessible

### User Flows

- [ ] **View Financial Summary**
  1. Land on dashboard
  2. Scan top 3 stat cards
  3. Read key numbers
  → Time to complete: < 5 seconds

- [ ] **Check Recent Activity**
  1. Scroll to transactions section
  2. Review recent items
  3. Click "View All" for details
  → Time to complete: < 10 seconds

- [ ] **Monitor Spending**
  1. View daily limit widget
  2. Check remaining budget
  3. Adjust spending if needed
  → Time to complete: < 5 seconds

---

## 10. Production Readiness

### Pre-Deployment Checklist

- [ ] All tests above passed
- [ ] No console errors
- [ ] No console warnings
- [ ] API keys secured (not in frontend code)
- [ ] Environment variables configured
- [ ] Error tracking enabled (e.g., Sentry)
- [ ] Analytics tracking added (e.g., Google Analytics)
- [ ] Backup plan documented

### Go-Live Checklist

- [ ] Staging environment tested
- [ ] Database migrations complete
- [ ] Cache cleared
- [ ] CDN configured
- [ ] SSL certificate valid
- [ ] Monitoring alerts set up
- [ ] Team notified of deployment
- [ ] Rollback plan ready

---

## 📊 Test Results Template

```
Test Date: _______________
Tester: _______________
Environment: [ ] Dev [ ] Staging [ ] Production

RESULTS:
✅ Passed: ______ / 100
❌ Failed: ______ / 100
⚠️  Warnings: ______

CRITICAL ISSUES:
1. _________________________________
2. _________________________________
3. _________________________________

MINOR ISSUES:
1. _________________________________
2. _________________________________
3. _________________________________

RECOMMENDATIONS:
_________________________________
_________________________________
_________________________________

APPROVAL:
[ ] Approved for production
[ ] Requires fixes before deployment
[ ] Blocked - critical issues found

Signed: _______________
```

---

## 🐛 Bug Report Template

When you find a bug, report it using this format:

```markdown
### Bug: [Brief description]

**Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happens]

**Environment:**
- Browser: 
- OS: 
- Screen Size: 

**Screenshots:**
[Attach screenshots]

**Console Errors:**
```
[Paste console errors]
```

**Additional Notes:**
[Any other relevant information]
```

---

## 📞 Support

If you encounter issues during testing:
1. Check browser console for errors
2. Verify API endpoints are responding
3. Review `API_REQUIREMENTS.md` for correct data format
4. Contact the development team

---

## ✅ Sign-Off

**Tested By:** _____________________  
**Date:** _____________________  
**Status:** [ ] Approved [ ] Rejected  
**Comments:** _____________________
