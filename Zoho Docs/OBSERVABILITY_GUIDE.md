# 📊 Observability & Security Guide

## Overview

This guide covers the comprehensive observability and security implementation for the ERP system, including structured logging, metrics collection, input validation, rate limiting, and security monitoring.

---

## Architecture

```
Backend Observability & Security Stack
├── Logging Layer
│   ├── Pino Logger (structured JSON logging)
│   ├── Request correlation tracking (X-Request-ID)
│   └── Environment-specific configurations
├── Metrics Collection
│   ├── Request/response metrics
│   ├── Service operation timing
│   ├── Database query performance
│   └── Custom business metrics
├── Input Validation
│   ├── Express-validator chains
│   ├── Zod schema validation
│   ├── Request sanitization
│   └── Content type verification
├── Rate Limiting
│   ├── Global rate limiting
│   ├── Auth endpoint protection
│   ├── User-based rate limiting
│   ├── Circuit breaker pattern
│   └── Per-operation limits
└── Security Monitoring
    ├── Brute force detection
    ├── Suspicious activity logging
    ├── Audit trail generation
    └── Security event alerts
```

---

## Backend Setup

### 1. Dependencies Installation

```bash
cd backend

# Install observability packages
npm install pino pino-http pino-pretty
npm install express-rate-limit express-validator
npm install uuid

# Install types
npm install --save-dev @types/express-rate-limit @types/uuid
```

### 2. Environment Variables

Create `.env` with logging configuration:

```env
# Logging
LOG_LEVEL=debug                    # debug, info, warn, error
NODE_ENV=development               # development, production
APP_VERSION=1.0.0

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000       # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100       # per window
AUTH_RATE_LIMIT_MAX=5             # failed auth attempts

# Metrics
METRICS_ENABLED=true
METRICS_RETENTION_HOURS=24
```

---

## Logging Configuration

### Pino Logger Setup

**File:** `backend/src/common/logger.ts`

The Pino logger provides:

1. **Structured JSON logging** for production
2. **Pretty console logging** for development
3. **Request correlation tracking** via unique IDs
4. **Performance metrics** with context

#### Using the Logger

```typescript
import { logger, createChildLogger, logRequestMetrics } from "@/common/logger";

// Basic logging
logger.info("Application started", { version: "1.0.0" });
logger.error("Database connection failed", error);

// Child logger with request context
app.use((req: Request, res: Response, next: NextFunction) => {
  const child = createChildLogger(req);
  child.info(`Processing ${req.method} ${req.path}`);
  next();
});

// Log metrics
logRequestMetrics(req, res, duration);
```

#### Log Levels

```
DEBUG   - Detailed debugging information (only in development)
INFO    - Informational messages (application flow)
WARN    - Warning messages (potential issues)
ERROR   - Error messages (failures)
```

#### Output Format (Development)

```
[2025-11-15T10:30:45.123Z] [INFO] 🚀 Starting ERP Backend Server...
[2025-11-15T10:30:46.456Z] [DEBUG] POST /auth/login duration: 234ms
[2025-11-15T10:30:47.789Z] [INFO] ✅ Server running on http://localhost:5000
```

#### Output Format (Production - JSON)

```json
{
  "level": 30,
  "time": "2025-11-15T10:30:46.456Z",
  "pid": 12345,
  "hostname": "server-01",
  "environment": "production",
  "version": "1.0.0",
  "msg": "POST /auth/login completed in 234ms",
  "requestId": "550e8400-e29b-41d4-a716-446655450000",
  "userId": "user-123",
  "userRole": "admin",
  "method": "POST",
  "path": "/auth/login",
  "statusCode": 200,
  "duration": 234
}
```

---

## Metrics Collection

### Middleware Integration

**File:** `backend/src/middleware/metrics.middleware.ts`

#### Metrics Tracked

1. **Request Metrics:**
   - Total requests count
   - Successful vs failed requests
   - Response time percentiles (p50, p95, p99)
   - Requests by method (GET, POST, etc.)
   - Requests by endpoint path
   - Status code distribution

2. **Service Metrics:**
   - Operation duration
   - Success/failure status
   - Operation-specific details

3. **Database Metrics:**
   - Query execution time
   - Query success rate
   - Operation type tracking

#### Recording Metrics

```typescript
import {
  recordMetric,
  recordDBMetric,
  recordEndpointMetric,
  recordServiceMetric,
} from "@/middleware/metrics.middleware";

// Custom metric
recordMetric("branch_dashboard_views", 1, "count", {
  branchId: "br-1",
  userId: "user-123",
});

// Database metric
recordDBMetric("select_branches", 45, true);

// Endpoint metric
recordEndpointMetric("/branches/br-1/dashboard", 200, 234);

// Service metric
recordServiceMetric("BranchService", "getBranchDashboard", 150, true);
```

#### Metrics Endpoint

Access collected metrics:

```bash
curl http://localhost:5000/metrics
```

Response:

```json
{
  "success": true,
  "data": {
    "timestamp": "2025-11-15T10:30:50.000Z",
    "requests": {
      "total": 1250,
      "successful": 1200,
      "failed": 50,
      "successRate": "96%"
    },
    "performance": {
      "avgResponseTime": "145ms",
      "p50": "120ms",
      "p95": "450ms",
      "p99": "850ms"
    },
    "endpoints": {
      "byMethod": {
        "GET": 750,
        "POST": 350,
        "PUT": 100,
        "DELETE": 50
      },
      "byPath": {
        "/branches/br-1/dashboard": 245,
        "/sales": 180,
        "/payroll": 150
      },
      "byStatusCode": {
        "200": 1100,
        "201": 50,
        "400": 40,
        "401": 10,
        "500": 5
      }
    }
  }
}
```

---

## Input Validation

### Middleware Integration

**File:** `backend/src/middleware/validation.middleware.ts`

#### Validation Strategies

1. **Express-Validator:** For simple field validation
2. **Zod Schemas:** For complex nested structures
3. **Sanitization:** Remove malicious inputs
4. **Type Checking:** Ensure correct data types

#### Using Express-Validator

```typescript
import {
  body,
  validationResult,
  handleValidationErrors,
  validateRequiredString,
  validateEmail,
  validatePassword,
  validateUUID,
} from "@/middleware/validation.middleware";

app.post(
  "/auth/register",
  [
    validateEmail(),
    validatePassword(),
    validateRequiredString("firstName", 2),
    validateRequiredString("lastName", 2),
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    // Safe to use req.body here
  }
);
```

#### Using Zod Validation

```typescript
import { z } from "zod";
import {
  validateBody,
  validateQuery,
} from "@/middleware/validation.middleware";

// Define schema
const createBranchSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(10),
  location: z.string().min(5),
  managerId: z.string().uuid(),
});

// Apply to route
app.post(
  "/branches",
  validateBody(createBranchSchema),
  async (req: Request, res: Response) => {
    // req.body is now type-safe and validated
  }
);
```

#### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must contain uppercase, lowercase, number, and special character"
      }
    ]
  }
}
```

#### Built-in Validators

```typescript
// String validation
validateRequiredString(field, (minLength = 1));

// Number validation
validateRequiredNumber(field);
validateOptionalNumber(field);

// Email validation
validateEmail();

// Date validation
validateDate(field);

// UUID validation
validateUUID(field);

// Enum validation
validateEnum(field, allowedValues);

// Password validation
validatePassword(); // min 8 chars, uppercase, lowercase, number, special char

// Content type validation
validateContentType("application/json");

// File validation
validateFile(maxSizeMB, allowedMimes);
```

---

## Rate Limiting

### Middleware Integration

**File:** `backend/src/middleware/rate-limit.middleware.ts`

#### Rate Limit Configurations

1. **Global Limiter:** 100 requests per 15 minutes
2. **Auth Limiter:** 5 failed attempts per 15 minutes
3. **API Limiter:** 60 requests per minute
4. **Heavy Operations:** 10 requests per hour
5. **Upload Limiter:** 50 uploads per 24 hours
6. **Search/Export:** 20 requests per 5 minutes

#### Integration into app.ts

```typescript
import {
  globalLimiter,
  authLimiter,
  apiLimiter,
  heavyOperationLimiter,
  uploadLimiter,
  searchExportLimiter,
} from "@/middleware/rate-limit.middleware";

// Apply global limiter to all routes
app.use(globalLimiter);

// Auth-specific limiter
app.post("/auth/login", authLimiter, authController.login);
app.post("/auth/register", authLimiter, authController.register);

// API limiter
app.get("/branches", apiLimiter, branchController.list);

// Heavy operations
app.post("/reports/export", heavyOperationLimiter, reportController.export);

// Upload limiter
app.post("/uploads", uploadLimiter, uploadController.upload);

// Search/Export
app.get("/branches/search", searchExportLimiter, branchController.search);
```

#### Rate Limit Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 1731667500000
  }
}
```

#### Response Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1731667500
Retry-After: 3600
```

---

## Circuit Breaker Pattern

Prevents cascading failures when downstream services are unavailable.

```typescript
import {
  checkCircuitBreaker,
  recordSuccess,
  recordFailure,
  getCircuitBreakerStatus,
} from "@/middleware/rate-limit.middleware";

// Check before calling external service
if (!checkCircuitBreaker("payment_service")) {
  return res.status(503).json({
    error: "Payment service temporarily unavailable",
  });
}

try {
  const result = await paymentService.charge(amount);
  recordSuccess("payment_service");
  return result;
} catch (error) {
  recordFailure("payment_service");
  throw error;
}

// Get status
const status = getCircuitBreakerStatus("payment_service");
console.log(status); // { status: "open", failureCount: 5, ... }
```

---

## Security Events Logging

### Audit Trail

```typescript
import { logSecurityEvent } from "@/common/logger";

// Log authentication failure
logSecurityEvent(
  "auth_failure",
  "medium",
  {
    ip: req.ip,
    email: req.body.email,
    reason: "invalid_credentials",
  },
  userId
);

// Log unauthorized access attempt
logSecurityEvent(
  "unauthorized_access",
  "high",
  {
    ip: req.ip,
    endpoint: "/admin/users",
    userRole: "user",
  },
  userId
);

// Log suspicious activity
logSecurityEvent("sql_injection_attempt", "critical", {
  ip: req.ip,
  queryParam: req.query.search,
  detectedPattern: "union select",
});
```

---

## Frontend Notifications

### Toast Component

**File:** `frontend/components/ui/toast.tsx`

#### Setup in Layout

```tsx
// app/layout.tsx
import { ToastProvider } from "@/components/ui/toast";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ToastProvider />
        {children}
      </body>
    </html>
  );
}
```

#### Usage Examples

```tsx
import {
  useToast,
  showSuccessToast,
  showErrorToast,
} from "@/components/ui/toast";

export default function MyComponent() {
  const toast = useToast();

  const handleSave = async () => {
    try {
      // Show loading toast
      const loadingId = toast.loading("Saving...");

      // API call
      const result = await api.save(data);

      // Update to success
      toast.update(loadingId, {
        message: "Saved successfully!",
        variant: "success",
      });
    } catch (error) {
      toast.error("Failed to save", {
        details: error.message,
        duration: 5000,
      });
    }
  };

  // Promise-based toast
  const handleAsyncOperation = async () => {
    await toast.async(fetchData(), {
      loading: "Loading data...",
      success: (data) => `Loaded ${data.length} items`,
      error: (err) => `Failed: ${err.message}`,
    });
  };

  return <button onClick={handleSave}>Save</button>;
}
```

#### Toast Variants

```typescript
// Success toast
showSuccessToast("Operation completed successfully");

// Error toast with details
showErrorToast("Failed to save", {
  details: "Email already exists",
  duration: 5000
});

// Warning toast
showWarningToast("This action cannot be undone");

// Info toast
showInfoToast("New update available");

// Loading toast
const id = showLoadingToast("Processing...");
// Later update to success/error
updateToast(id, { message: "Done!", variant: "success" });

// Progress toast
showProgressToast("Uploading file...", 75); // 75% complete

// Batch toasts
showBatchToasts([
  { message: "Item 1 processed", variant: "success", delay: 0 },
  { message: "Item 2 processed", variant: "success", delay: 200 },
  { message: "Item 3 processed", variant: "success", delay: 400 },
]);

// Custom content
showCustomToast(
  <div className="flex items-center gap-2">
    <CheckIcon /> Saved successfully
  </div>
);
```

### Alert Dialog Component

**File:** `frontend/components/ui/alert-dialog.tsx`

#### Usage Examples

```tsx
import {
  ConfirmDialog,
  DangerDialog,
  InfoDialog,
  useAlertDialog,
} from "@/components/ui/alert-dialog";
import { MdDelete, MdWarning } from "react-icons/md";

export default function MyComponent() {
  const deleteDialog = useAlertDialog();
  const confirmDialog = useAlertDialog();

  const handleDeleteConfirm = async () => {
    await api.delete(itemId);
    showSuccessToast("Item deleted");
  };

  return (
    <>
      <button onClick={deleteDialog.openDialog}>Delete Item</button>

      {/* Danger dialog */}
      <DangerDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.setOpen}
        title="Delete Item?"
        message="This action cannot be undone. All associated data will be permanently deleted."
        confirmText="Delete"
        onConfirm={handleDeleteConfirm}
        icon={<MdDelete size={24} />}
      />

      {/* Confirmation dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={confirmDialog.setOpen}
        title="Confirm Action"
        description="Are you sure you want to proceed?"
        confirmText="Yes, proceed"
        variant="default"
        onConfirm={() => {
          // Handle confirmation
          confirmDialog.closeDialog();
        }}
      />

      {/* Info dialog */}
      <InfoDialog
        open={true}
        onOpenChange={setOpen}
        title="Important Notice"
        message="This feature is only available for admin users."
        actionText="OK"
        icon={<MdWarning />}
      />
    </>
  );
}
```

#### Dialog Variants

```tsx
// Confirmation (default)
<ConfirmDialog variant="default" {...props} />

// Destructive (delete)
<ConfirmDialog variant="destructive" {...props} />

// Success (positive action)
<ConfirmDialog variant="success" {...props} />

// Warning (caution needed)
<ConfirmDialog variant="warning" {...props} />
```

---

## Testing Security & Observability

### Test Rate Limiting

```bash
# Test global limiter (should fail on 101st request)
for i in {1..110}; do
  curl http://localhost:5000/health
done

# Test auth limiter (should fail on 6th attempt)
for i in {1..10}; do
  curl -X POST http://localhost:5000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrong"}'
done
```

### Test Input Validation

```bash
# Valid request
curl -X POST http://localhost:5000/branches \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Branch",
    "code": "BR-001",
    "location": "123 Main St",
    "managerId": "550e8400-e29b-41d4-a716-446655450000"
  }'

# Invalid request (missing required fields)
curl -X POST http://localhost:5000/branches \
  -H "Content-Type: application/json" \
  -d '{"name": "Downtown Branch"}'

# Expected error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Input validation failed",
    "details": [
      { "field": "code", "message": "code is required" },
      { "field": "location", "message": "location is required" }
    ]
  }
}
```

### Test Logging

```bash
# Check application logs
tail -f logs/app.log

# Filter by level
grep "\[ERROR\]" logs/app.log

# Filter by component
grep "BranchService" logs/app.log

# Real-time metrics
watch -n 5 'curl -s http://localhost:5000/metrics | jq ".data.performance"'
```

---

## Monitoring Dashboard

Recommended tools for monitoring:

1. **ELK Stack** (Elasticsearch, Logstash, Kibana)
   - Centralized log aggregation
   - Real-time searching and analytics

2. **Grafana** - Metrics visualization
   - Custom dashboards
   - Alert configurations

3. **DataDog** - APM and monitoring
   - Distributed tracing
   - Real-user monitoring

4. **New Relic** - Application performance
   - Insights on performance
   - Error tracking

---

## Production Checklist

- [ ] Pino logger configured for JSON output
- [ ] Log rotation set up
- [ ] Request ID tracking enabled
- [ ] Metrics collection active
- [ ] All endpoints have input validation
- [ ] Rate limiting enabled on all routes
- [ ] Circuit breaker configured for external services
- [ ] Security events logged to audit trail
- [ ] Toast notifications configured in frontend
- [ ] Alert dialogs tested for critical operations
- [ ] Error handling tested with mock API failures
- [ ] Performance metrics monitored
- [ ] Log aggregation configured
- [ ] Alert thresholds set

---

## Performance Tuning

### Optimize Logging

```typescript
// Only log in development
if (isDevelopment) {
  logger.debug("Detailed debug info", { details });
}

// Batch log writes
logger.flush();
```

### Optimize Metrics

```typescript
// Limit metrics retention
if (customMetrics.length > 10000) {
  customMetrics.splice(0, customMetrics.length - 5000);
}

// Sample high-volume metrics
if (Math.random() < 0.1) { // Log 10% of requests
  recordMetric(...);
}
```

### Rate Limit Store Cleanup

```typescript
// Automatically cleans up every hour
// See cleanupUserRateLimitStore()
```

---

## Version History

| Version | Date       | Changes                                                               |
| ------- | ---------- | --------------------------------------------------------------------- |
| 1.0.0   | 2025-11-15 | Initial release with Pino logging, metrics, validation, rate limiting |

---

**Status:** ✅ Production Ready

Last Updated: November 15, 2025
