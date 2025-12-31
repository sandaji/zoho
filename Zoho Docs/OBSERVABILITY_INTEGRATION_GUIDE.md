# 🛡️ Observability & Security Integration Guide

## Quick Start

### Backend Setup (5 minutes)

1. **Install dependencies:**

   ```bash
   cd backend
   npm install
   ```

2. **Verify middleware is integrated in app.ts:**

   ```typescript
   // Already configured in src/app.ts:
   // - Request ID tracking
   // - Pino HTTP logging
   // - Input sanitization
   // - Global rate limiting
   // - Metrics collection
   ```

3. **Start the server:**

   ```bash
   npm run dev
   ```

4. **Check logs and metrics:**

   ```bash
   # Terminal 1: View logs
   npm run dev

   # Terminal 2: View metrics
   curl http://localhost:5000/metrics
   ```

### Frontend Setup (5 minutes)

1. **Install dependencies:**

   ```bash
   cd frontend
   npm install
   ```

2. **Add ToastProvider to layout:**

   ```tsx
   // app/layout.tsx
   import { ToastProvider } from "@/components/ui/toast";

   export default function RootLayout({ children }) {
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

3. **Use Toast in components:**

   ```tsx
   import { useToast } from "@/components/ui/toast";

   export default function MyComponent() {
     const toast = useToast();

     const handleSave = async () => {
       const id = toast.loading("Saving...");
       try {
         await api.save(data);
         toast.update(id, {
           message: "Saved!",
           variant: "success",
         });
       } catch (error) {
         toast.error("Save failed", { details: error.message });
       }
     };

     return <button onClick={handleSave}>Save</button>;
   }
   ```

---

## Backend Examples

### Example 1: Add Rate Limiting to Auth Endpoints

```typescript
// backend/src/routes/auth.routes.ts
import { authLimiter } from "@/middleware/rate-limit.middleware";
import { authController } from "@/controllers/auth.controller";
import { validateBody } from "@/middleware/validation.middleware";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post(
  "/login",
  authLimiter, // Rate limit first
  validateBody(loginSchema), // Validate input
  authController.login // Handler
);
```

### Example 2: Validate and Log Branch Creation

```typescript
// backend/src/routes/branch.routes.ts
import {
  body,
  handleValidationErrors,
} from "@/middleware/validation.middleware";
import { apiLimiter } from "@/middleware/rate-limit.middleware";
import { branchController } from "@/controllers/branch.controller";
import { createChildLogger } from "@/common/logger";

router.post(
  "/",
  apiLimiter,
  [
    body("name").notEmpty().withMessage("Branch name required"),
    body("code").notEmpty().withMessage("Branch code required"),
    body("location").notEmpty().withMessage("Location required"),
  ],
  handleValidationErrors,
  async (req: Request, res: Response, next: NextFunction) => {
    const logger = createChildLogger(req);
    logger.info("Creating branch", { name: req.body.name });

    try {
      const branch = await branchController.create(req, res);
      logger.info("Branch created successfully", { branchId: branch.id });
    } catch (error) {
      logger.error("Failed to create branch", error as Error);
      next(error);
    }
  }
);
```

### Example 3: Record Custom Metrics in Service

```typescript
// backend/src/modules/finance/service/branch.service.ts
import { recordServiceMetric } from "@/middleware/metrics.middleware";
import { logServiceMetrics } from "@/common/logger";

export class BranchService {
  async getBranchDashboard(branchId: string) {
    const startTime = Date.now();

    try {
      const dashboard = await this.fetchDashboardData(branchId);

      const duration = Date.now() - startTime;

      // Record metrics
      recordServiceMetric(
        "BranchService",
        "getBranchDashboard",
        duration,
        true
      );
      logServiceMetrics(
        "BranchService",
        "getBranchDashboard",
        duration,
        true,
        undefined,
        { branchId }
      );

      return dashboard;
    } catch (error) {
      const duration = Date.now() - startTime;
      recordServiceMetric(
        "BranchService",
        "getBranchDashboard",
        duration,
        false
      );

      throw error;
    }
  }
}
```

### Example 4: Security Event Logging

```typescript
// backend/src/controllers/auth.controller.ts
import { logSecurityEvent } from "@/common/logger";

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    const { email, password } = req.body;

    try {
      const user = await userService.findByEmail(email);

      if (!user || !(await bcrypt.compare(password, user.password))) {
        logSecurityEvent("auth_failure", "medium", {
          ip: req.ip,
          email,
          reason: "invalid_credentials",
        });

        return res.status(401).json({
          success: false,
          error: { code: "INVALID_CREDENTIALS" },
        });
      }

      logSecurityEvent("auth_success", "low", {
        ip: req.ip,
        email,
        userId: user.id,
      });

      // Generate token...
    } catch (error) {
      next(error);
    }
  }
}
```

---

## Frontend Examples

### Example 1: Show Success/Error After API Call

```tsx
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";

export default function CreateBranchForm() {
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (formData: BranchFormData) => {
    const toastId = toast.loading("Creating branch...");

    try {
      const response = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to create branch");
      }

      const { data } = await response.json();

      toast.update(toastId, {
        message: `Branch "${data.name}" created successfully!`,
        variant: "success",
      });

      // Navigate after 2 seconds
      setTimeout(() => {
        router.push(`/dashboard/branch/${data.id}`);
      }, 2000);
    } catch (error) {
      toast.handleApiError(error, "Failed to create branch");
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Example 2: Confirmation Dialog for Dangerous Action

```tsx
import { DangerDialog, useAlertDialog } from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/toast";
import { MdDelete } from "react-icons/md";

export default function BranchCard({ branch }: { branch: Branch }) {
  const deleteDialog = useAlertDialog();
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await fetch(`/api/branches/${branch.id}`, {
        method: "DELETE",
      });

      toast.success("Branch deleted successfully");
      deleteDialog.closeDialog();

      // Refresh page
      window.location.reload();
    } catch (error) {
      toast.error("Failed to delete branch");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button onClick={deleteDialog.openDialog} className="text-red-600">
        Delete
      </button>

      <DangerDialog
        open={deleteDialog.open}
        onOpenChange={deleteDialog.setOpen}
        title="Delete Branch?"
        message={`This will permanently delete "${branch.name}" and all associated data. This action cannot be undone.`}
        confirmText="Delete Branch"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        icon={<MdDelete size={24} />}
      />
    </>
  );
}
```

### Example 3: Progress Updates for Long Operations

```tsx
import { useToast } from "@/components/ui/toast";

export default function BulkImportForm() {
  const toast = useToast();

  const handleBulkImport = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    // Create upload with progress
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percentComplete = (e.loaded / e.total) * 100;
        toast.showProgressToast(`Uploading ${file.name}...`, percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        toast.success("Import completed successfully!");
      } else {
        toast.error("Import failed");
      }
    });

    xhr.addEventListener("error", () => {
      toast.error("Upload failed");
    });

    xhr.open("POST", "/api/import");
    xhr.send(formData);
  };

  return (
    <input
      type="file"
      onChange={(e) => {
        if (e.target.files?.[0]) {
          handleBulkImport(e.target.files[0]);
        }
      }}
    />
  );
}
```

### Example 4: Promise-based Toast for Async Operations

```tsx
import { useToast } from "@/components/ui/toast";

export default function DataExport() {
  const toast = useToast();

  const handleExport = () => {
    const exportPromise = fetch("/api/reports/export", {
      method: "POST",
      body: JSON.stringify({ format: "pdf" }),
    }).then((res) => res.blob());

    toast.promise(exportPromise, {
      loading: "Generating report...",
      success: (data) => {
        // Trigger download
        const url = window.URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = "report.pdf";
        a.click();

        return "Report exported successfully!";
      },
      error: (err) => `Export failed: ${err.message}`,
    });
  };

  return <button onClick={handleExport}>Export Report</button>;
}
```

---

## Monitoring Dashboard Setup

### View Logs in Real-time

```bash
# Start server in development
npm run dev

# In another terminal, filter logs
npm run dev | grep "\[ERROR\]"
npm run dev | grep "BranchService"
npm run dev | grep "rate_limit"
```

### Check Metrics Endpoint

```bash
# Get full metrics
curl http://localhost:5000/metrics | jq

# Pretty print
curl http://localhost:5000/metrics | jq '.data.performance'

# Monitor in real-time
watch -n 2 'curl -s http://localhost:5000/metrics | jq ".data.requests.successRate"'
```

### Expected Metrics Output

```json
{
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
  }
}
```

---

## API Error Handling Flow

### Backend → Frontend Error Flow

```
Backend Error
    ↓
Error Middleware Catches It
    ↓
Logs to Pino with severity
    ↓
Returns JSON error response
    ↓
Frontend Toast Component
    ↓
User Sees Clear Error Message
```

### Example Error Response

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
      }
    ]
  }
}
```

### Frontend Handling

```tsx
try {
  const response = await fetch("/api/endpoint", {
    /* ... */
  });

  if (!response.ok) {
    const error = await response.json();
    toast.error(error.error.message, {
      details: error.error.details?.[0]?.message,
    });
    return;
  }

  const data = await response.json();
  toast.success("Operation completed");
} catch (error) {
  toast.handleApiError(error, "Network error");
}
```

---

## Security Best Practices

### Rate Limiting Strategy

1. **Auth endpoints:** 5 attempts per 15 minutes
2. **API endpoints:** 60 requests per minute
3. **Search/Export:** 20 requests per 5 minutes
4. **Uploads:** 50 per 24 hours
5. **Heavy ops:** 10 per hour

### Input Validation Rules

1. **Required fields:** Must not be empty
2. **Email:** Valid format with normalization
3. **Password:** Min 8 chars, mixed case, numbers, special chars
4. **UUIDs:** Valid RFC 4122 format
5. **Enums:** Only allowed values accepted
6. **Sanitization:** Remove null bytes and script tags

### Logging Sensitive Data

❌ **DON'T log:**

- Passwords
- API keys
- Credit card numbers
- Personal identification numbers
- Session tokens

✅ **DO log:**

- User IDs
- Email addresses
- IP addresses
- Timestamps
- Error codes and messages

---

## Troubleshooting

### Issue: Rate limit errors immediately

**Solution:** Check rate limit configuration in environment variables

```bash
# Increase for development
RATE_LIMIT_WINDOW_MS=3600000    # 1 hour
RATE_LIMIT_MAX_REQUESTS=1000    # 1000 requests
```

### Issue: Toast notifications not showing

**Solution:** Ensure ToastProvider is in layout.tsx

```tsx
// ✅ Correct
<body>
  <ToastProvider />  {/* Must be here */}
  {children}
</body>

// ❌ Wrong
<body>
  {children}
  <ToastProvider />  {/* Too late */}
</body>
```

### Issue: Logs not appearing in production format

**Solution:** Check NODE_ENV and LOG_LEVEL

```bash
NODE_ENV=production LOG_LEVEL=info npm run start
```

### Issue: Metrics endpoint returning empty data

**Solution:** Make a few requests first, then check metrics

```bash
# Make requests
curl http://localhost:5000/health
curl http://localhost:5000/branches

# Then check metrics
curl http://localhost:5000/metrics
```

---

## Next Steps

1. **Update auth routes** to use `authLimiter`
2. **Add Zod validation** to all endpoints
3. **Configure monitoring** dashboard (Grafana/DataDog)
4. **Set up alerts** for error rate > 5%
5. **Enable log rotation** for production
6. **Implement custom metrics** for business logic
7. **Add trace IDs** to all external API calls

---

**Status:** ✅ Ready for Integration

Last Updated: November 15, 2025
