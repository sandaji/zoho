# Code Samples & Usage Examples

Complete working examples for JWT authentication system.

---

## Backend Code Examples

### 1. Using Auth Middleware

```typescript
// Protected endpoint that requires authentication
router.get("/api/profile", authMiddleware, (req, res) => {
  // req.user is now available
  res.json({
    userId: req.user.userId,
    email: req.user.email,
    role: req.user.role,
  });
});
```

### 2. Role-Based Protection

```typescript
// Admin-only endpoint
router.delete("/api/users/:id", authMiddleware, adminOnly, (req, res, next) => {
  try {
    // Only admins can access
    res.json({ message: "User deleted" });
  } catch (error) {
    next(error);
  }
});

// Manager or Admin
router.post(
  "/api/reports",
  authMiddleware,
  managerOrAdmin,
  (req, res, next) => {
    try {
      // Managers and admins can create reports
      res.json({ message: "Report created" });
    } catch (error) {
      next(error);
    }
  }
);
```

### 3. Using JWT Service

```typescript
import { generateToken, verifyToken, decodeToken } from "../common/jwt";

// Generate token
const token = generateToken({
  userId: "user-123",
  email: "user@example.com",
  role: "admin",
});

// Verify token
try {
  const payload = verifyToken(token);
  console.log(payload); // { userId, email, role, iat, exp }
} catch (error) {
  console.error("Token invalid or expired");
}

// Decode without verification
const payload = decodeToken(token);
console.log(payload);
```

### 4. Using Password Service

```typescript
import { hashPassword, verifyPassword } from "../common/password";

// Hash a password
const hash = await hashPassword("mySecurePassword");

// Verify password
const isValid = await verifyPassword("mySecurePassword", hash);
console.log(isValid); // true

const isInvalid = await verifyPassword("wrongPassword", hash);
console.log(isInvalid); // false
```

### 5. Auth Service Usage

```typescript
import { AuthService } from "../modules/auth/service";

const authService = new AuthService();

// Register user
const newUser = await authService.register({
  email: "user@example.com",
  password: "SecurePass123",
  name: "John Doe",
  role: "user",
});

// Login
const { token, user } = await authService.login({
  email: "user@example.com",
  password: "SecurePass123",
});

// Get user
const userData = await authService.getUserById("user-id");

// Update user
const updated = await authService.updateUser("user-id", {
  name: "Jane Doe",
});
```

### 6. Error Handling

```typescript
import { AppError, ErrorCode } from "../common/errors";

try {
  // Some operation
} catch (error) {
  // Throw structured error
  throw new AppError(ErrorCode.UNAUTHORIZED, 401, "Invalid credentials");
}

// Error middleware catches and formats:
// {
//   success: false,
//   error: {
//     code: "UNAUTHORIZED",
//     message: "Invalid credentials",
//     timestamp: "2025-11-13T..."
//   }
// }
```

---

## Frontend Code Examples

### 1. Using Auth Hook

```typescript
import { useAuth } from "@/lib/auth-context";

export function UserProfile() {
  const { user, isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <p>Please log in</p>;
  }

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      <p>Email: {user?.email}</p>
      <p>Role: {user?.role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### 2. Using API Client

```typescript
import { apiClient } from "@/lib/api-client";

// Login
const loginResponse = await apiClient.request("/auth/login", "POST", {
  email: "user@example.com",
  password: "password123",
});

if (loginResponse.success) {
  const { token, user } = loginResponse.data;
  console.log("Logged in:", user);
} else {
  console.error("Login failed:", loginResponse.error?.message);
}

// Get current user
const meResponse = await apiClient.request("/auth/me", "GET");

// Update profile
const updateResponse = await apiClient.request("/auth/profile", "PATCH", {
  name: "New Name",
});
```

### 3. Protected Route Component

```typescript
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function ProtectedPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/auth/login");
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <div>Protected Content</div>;
}
```

### 4. Role-Based Component

```typescript
import { useAuth } from "@/lib/auth-context";

export function AdminPanel() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <p>Access denied. Admins only.</p>;
  }

  return <div>Admin Panel</div>;
}
```

### 5. Form with Validation

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const schema = z.object({
  name: z.string().min(2, "Name too short"),
  email: z.string().email("Invalid email"),
});

type FormData = z.infer<typeof schema>;

export function ProfileForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  function onSubmit(data: FormData) {
    console.log("Form data:", data);
    // Submit to API
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Your name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit">Save Changes</Button>
      </form>
    </Form>
  );
}
```

### 6. Using Sidebar Navigation

```typescript
// Sidebar automatically:
// - Filters menu items based on user role
// - Shows user info and role badge
// - Provides logout button
// - Responsive on mobile

// Just use it in layout:
import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

---

## API Request Examples

### cURL Examples

#### Login

```bash
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
#     "user": {
#       "id": "user-123",
#       "email": "user@example.com",
#       "name": "User Name",
#       "role": "user"
#     }
#   }
# }
```

#### Get Current User

```bash
curl -X GET http://localhost:5000/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Response:
# {
#   "success": true,
#   "data": {
#     "id": "user-123",
#     "email": "user@example.com",
#     "name": "User Name",
#     "role": "user",
#     "createdAt": "2025-11-13T..."
#   }
# }
```

#### Register

```bash
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "name": "New User",
    "role": "user"
  }'
```

#### Protected Endpoint Example

```bash
curl -X GET http://localhost:5000/pos/sales \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Postman Examples

**Login**

```
POST /auth/login
Body (raw JSON):
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Protected Request**

```
GET /auth/me
Headers:
  Authorization: Bearer <token_from_login>
```

---

## Configuration Examples

### Backend .env

```bash
# Database
DATABASE_URL="postgresql://admin:password@localhost:5432/zoho_erp"

# JWT
JWT_SECRET="your-256-bit-secret-key-minimum-32-characters"
JWT_EXPIRY="24h"

# Server
PORT=5000
NODE_ENV="development"

# CORS
FRONTEND_URL="http://localhost:3000"
```

### Frontend .env.local

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Common Patterns

### Pattern 1: Login and Store Token

```typescript
// 1. User submits form
const data = await apiClient.request("/auth/login", "POST", {
  email,
  password,
});

// 2. Check success
if (!data.success) {
  setError(data.error?.message);
  return;
}

// 3. Store in context
login(data.data.token, data.data.user);

// 4. Redirect
router.push("/dashboard");
```

### Pattern 2: Protected Route with Redirect

```typescript
useEffect(() => {
  if (!isLoading && !isAuthenticated) {
    router.push("/auth/login");
  }
}, [isLoading, isAuthenticated, router]);
```

### Pattern 3: Role-Based UI

```typescript
{
  user?.role === "admin" && <AdminPanel />
}

{
  ["manager", "admin"].includes(user?.role) && <ManagerFeatures />
}
```

### Pattern 4: API Error Handling

```typescript
try {
  const response = await apiClient.request("/some/endpoint", "GET");

  if (!response.success) {
    throw new Error(response.error?.message);
  }

  // Handle success
} catch (error) {
  setError(error instanceof Error ? error.message : "Unknown error");
}
```

---

## Testing Checklist

### Manual Testing

- [ ] Register new user via frontend
- [ ] Register user via API (cURL)
- [ ] Login with valid credentials
- [ ] Login with invalid email
- [ ] Login with invalid password
- [ ] Access protected route without token
- [ ] Access protected route with token
- [ ] Access admin endpoint as user (should fail)
- [ ] Access admin endpoint as admin (should succeed)
- [ ] Update profile
- [ ] Verify token in localStorage
- [ ] Verify logout clears token
- [ ] Verify auto-redirect to login
- [ ] Test sidebar role-based visibility
- [ ] Test on mobile (responsive)

### API Testing

```bash
# Test health
curl http://localhost:5000/health

# Register
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123","name":"Test"}'

# Login
curl -X POST http://localhost:5000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'

# Save token from response as $TOKEN

# Get user
curl http://localhost:5000/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Try without token (should 401)
curl http://localhost:5000/auth/me

# Try protected endpoint
curl http://localhost:5000/pos/sales \
  -H "Authorization: Bearer $TOKEN"
```

---

**All examples ready to use!** Copy and modify as needed. 🎉
