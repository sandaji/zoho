# System Architecture Diagrams

Visual representations of the JWT authentication system.

---

## 🏗️ High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                           USER BROWSER                                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    FRONTEND (Next.js 16)                         │ │
│  │                                                                  │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐│ │
│  │  │ Login Page       │  │ Dashboard        │  │ Sidebar Nav    ││ │
│  │  │                  │  │ (Protected)      │  │ (Role-based)   ││ │
│  │  │ ✓ Form Validation│  │ ✓ User Profile   │  │ ✓ Admin Panel  ││ │
│  │  │ ✓ Error Display  │  │ ✓ Stats Cards    │  │ ✓ User Access  ││ │
│  │  │ ✓ Loading State  │  │ ✓ Quick Actions  │  │ ✓ Manager View ││ │
│  │  └──────────────────┘  └──────────────────┘  └────────────────┘│ │
│  │           ▲                      ▲                                 │ │
│  │           │ (Form Submit)        │ (Component Access)             │ │
│  │           ▼                      ▼                                 │ │
│  │  ┌──────────────────────────────────────────────────────────────┐│ │
│  │  │         AuthContext (useAuth hook)                           ││ │
│  │  │  ✓ user (name, email, role, id)                             ││ │
│  │  │  ✓ token (JWT stored in localStorage)                       ││ │
│  │  │  ✓ isAuthenticated                                          ││ │
│  │  │  ✓ login() / logout() methods                               ││ │
│  │  └──────────────────────────────────────────────────────────────┘│ │
│  │           ▲                                                        │ │
│  │           │ (HTTP Requests)                                      │ │
│  │           ▼                                                        │ │
│  │  ┌──────────────────────────────────────────────────────────────┐│ │
│  │  │  API Client                                                  ││ │
│  │  │  • Auto-inject Authorization: Bearer <token> header         ││ │
│  │  │  • Global error handling                                    ││ │
│  │  │  • Type-safe responses                                      ││ │
│  │  └──────────────────────────────────────────────────────────────┘│ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                            │                                          │
│                            │ (HTTPS/CORS)                            │
│                            │ Authorization: Bearer <JWT>             │
│                            ▼                                          │
└─────────────────────────────┼──────────────────────────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Internet / CORS   │
                    └─────────┬──────────┘
                              │
┌─────────────────────────────▼──────────────────────────────────────────┐
│                   BACKEND (Express.js + TypeScript)                    │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                       Express App                                │ │
│  │                                                                  │ │
│  │  ┌────────────────┐  ┌──────────────────┐  ┌──────────────────┐│ │
│  │  │ Public Routes  │  │ Protected Routes │  │ Protected Routes ││ │
│  │  │                │  │ (authMiddleware) │  │ (Role Middleware)││ │
│  │  │ POST /login    │  │ GET /me          │  │ POST /pos/sales  ││ │
│  │  │ POST /register │  │ PATCH /profile   │  │ POST /warehouse  ││ │
│  │  └────────────────┘  └──────────────────┘  │ POST /finance/*  ││ │
│  │                                             └──────────────────┘│ │
│  │                                                                  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                            ▲                                          │
│                            │                                          │
│  ┌────────────────────────┴───────────────────────────────────────┐  │
│  │                   Auth Middleware Stack                        │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  authMiddleware()                                        │ │  │
│  │  │  • Extract token from Authorization header              │ │  │
│  │  │  • Verify JWT signature (HS256)                         │ │  │
│  │  │  • Check expiry                                         │ │  │
│  │  │  • Attach TokenPayload to req.user                      │ │  │
│  │  │  • Throw 401 if invalid/expired                         │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                            │                                  │  │
│  │                            ▼                                  │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  roleMiddleware(["admin", "manager"])                    │ │  │
│  │  │  • Check req.user.role in allowedRoles                  │ │  │
│  │  │  • Allow admin/manager roles                            │ │  │
│  │  │  • Throw 403 Forbidden if insufficient role             │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  ┌──────────────────────────────────────────────────────────┐ │  │
│  │  │  errorMiddleware()                                       │ │  │
│  │  │  • Catch AppError and format response                   │ │  │
│  │  │  • Return structured JSON errors                        │ │  │
│  │  │  • Include code, message, details, timestamp            │ │  │
│  │  └──────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    Auth Module (MVC Pattern)                     │ │
│  │                                                                  │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │  HTTP Request → Controller                             │   │ │
│  │  │  • Parse & validate input                              │   │ │
│  │  │  • Call service method                                 │   │ │
│  │  │  • Catch errors & pass to next()                       │   │ │
│  │  │  • Return response                                     │   │ │
│  │  │                                                         │   │ │
│  │  │  AuthController                                        │   │ │
│  │  │  ├─ login(email, password)                             │   │ │
│  │  │  ├─ register(email, password, name)                    │   │ │
│  │  │  ├─ me() → req.user info                               │   │ │
│  │  │  └─ updateProfile(name, role)                          │   │ │
│  │  └──────────────────┬──────────────────────────────────────┘   │ │
│  │                     │                                           │ │
│  │                     ▼                                           │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │  Service Layer                                          │   │ │
│  │  │  • Business logic implementation                        │   │ │
│  │  │  • Database operations via Prisma                       │   │ │
│  │  │  • Error handling & validation                          │   │ │
│  │  │                                                         │   │ │
│  │  │  AuthService                                           │   │ │
│  │  │  ├─ login() → Find user, verify password, gen token    │   │ │
│  │  │  ├─ register() → Hash password, create user            │   │ │
│  │  │  ├─ getUserById() → Fetch & return user               │   │ │
│  │  │  └─ updateUser() → Update profile                      │   │ │
│  │  └──────────────────┬──────────────────────────────────────┘   │ │
│  │                     │                                           │ │
│  │                     ▼                                           │ │
│  │  ┌─────────────────────────────────────────────────────────┐   │ │
│  │  │  Data Access Layer                                      │   │ │
│  │  │  • Prisma ORM                                           │   │ │
│  │  │  • Database queries                                     │   │ │
│  │  │                                                         │   │ │
│  │  │  Utilities:                                             │   │ │
│  │  │  ├─ jwt.ts → Token generation & verification           │   │ │
│  │  │  ├─ password.ts → Bcrypt hashing & verification        │   │ │
│  │  │  └─ errors.ts → Error classes & factories              │   │ │
│  │  └──────────────────┬──────────────────────────────────────┘   │ │
│  │                     │                                           │ │
│  │                     ▼                                           │ │
│  └─────────────────────┼──────────────────────────────────────────┘ │
│                        │                                            │
└────────────────────────┼────────────────────────────────────────────┘
                         │
                         │ (SQL Queries)
                         ▼
                    ┌─────────────┐
                    │  PostgreSQL │
                    │             │
                    │  users      │
                    │  (User Model)
                    └─────────────┘
```

---

## 🔐 JWT Token Flow

```
                        Frontend (Client)
                              │
                              │ User enters email + password
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Form Validation     │
                    │ (Zod Schema)        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ apiClient.request() │
                    │ POST /auth/login    │
                    └──────────┬──────────┘
                               │
                               │ HTTP POST
                               │ Content-Type: application/json
                               │ Body: { email, password }
                               │
                               ▼
                        Backend (Express)
                               │
                               ▼
                    ┌─────────────────────┐
                    │ POST /auth/login │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ AuthController      │
                    │ .login()            │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ AuthService         │
                    │ .login()            │
                    │                     │
                    │ 1. Find user by     │
                    │    email            │
                    │ 2. Verify password  │
                    │    with bcrypt      │
                    │ 3. Generate JWT     │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ jwt.generateToken() │
                    │                     │
                    │ Payload:            │
                    │ {                   │
                    │  userId,            │
                    │  email,             │
                    │  role,              │
                    │  iat,               │
                    │  exp: +24h          │
                    │ }                   │
                    │                     │
                    │ Sign with:          │
                    │ • JWT_SECRET        │
                    │ • HS256 algorithm   │
                    │ • Result: <token>   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Return Response     │
                    │ {                   │
                    │  success: true,     │
                    │  data: {            │
                    │    token: "...",    │
                    │    user: {...}      │
                    │  }                  │
                    │ }                   │
                    └──────────┬──────────┘
                               │
                               │ HTTP 200 OK
                               │ Content-Type: application/json
                               │
                               ▼
                        Frontend (Client)
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Extract:            │
                    │ • token             │
                    │ • user data         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Save to localStorage│
                    │ • auth_token        │
                    │ • auth_user         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Update AuthContext  │
                    │ • user = userData   │
                    │ • token = token     │
                    │ • isAuthenticated   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Redirect to         │
                    │ /dashboard          │
                    └─────────────────────┘
```

---

## 🛡️ Protected Request Flow

```
                        Frontend (Client)
                              │
                              │ Need to fetch /pos/sales
                              │
                              ▼
                    ┌──────────────────────┐
                    │ apiClient.request()  │
                    │ GET /pos/sales    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ getToken()           │
                    │ from localStorage    │
                    │ "auth_token"         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Add Authorization    │
                    │ Header:              │
                    │ Bearer <token>       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ fetch(url, {         │
                    │  method: "GET",      │
                    │  headers: {          │
                    │   Authorization: ... │
                    │  }                   │
                    │ })                   │
                    └──────────┬───────────┘
                               │
                               │ HTTP GET
                               │ Authorization: Bearer eyJ...
                               │
                               ▼
                        Backend (Express)
                               │
                               ▼
                    ┌──────────────────────┐
                    │ GET /pos/sales    │
                    │ [authMiddleware]     │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ authMiddleware()     │
                    │                      │
                    │ Extract token from   │
                    │ Authorization header │
                    │ Format: "Bearer xxx" │
                    │ Extract: "xxx"       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ jwt.verifyToken()    │
                    │                      │
                    │ Check signature      │
                    │ against JWT_SECRET   │
                    │ using HS256          │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┴────────────────────────┐
        │                                               │
    Valid?                                        Invalid/Expired?
        │                                               │
        ▼                                               ▼
  ┌─────────────┐                            ┌──────────────────┐
  │ Decode      │                            │ Throw AppError   │
  │ payload     │                            │ code: UNAUTHORIZED
  │ Extract:    │                            │ status: 401      │
  │ • userId    │                            └────────┬─────────┘
  │ • email     │                                     │
  │ • role      │                                     ▼
  │ • exp       │                            ┌──────────────────┐
  └──────┬──────┘                            │ Error Middleware │
         │                                   │                  │
         ▼                                   │ Format & return  │
  ┌─────────────┐                            │ error response   │
  │ Attach to   │                            └────────┬─────────┘
  │ req.user    │                                     │
  └──────┬──────┘                                     │
         │                                           │
         ▼                                           │
  ┌─────────────────────────────────────────────────┘
  │
  ▼
  [roleMiddleware] (if required for endpoint)

  Check if req.user.role in allowedRoles

  If allowed:
    ▼
    Continue to Controller
    ▼
    Fetch data
    ▼
    Return HTTP 200 + data

  If not allowed:
    ▼
    Throw AppError (FORBIDDEN)
    ▼
    Return HTTP 403 + error
```

---

## 🗂️ File Organization

```
Backend:
  src/
  ├── common/
  │   ├── jwt.ts              (Token management)
  │   ├── password.ts         (Bcrypt hashing)
  │   ├── auth.ts             (Middleware)
  │   ├── database.ts         (Prisma client)
  │   ├── logger.ts           (Logging)
  │   └── errors.ts           (Error classes)
  │
  ├── modules/
  │   ├── auth/
  │   │   ├── controller/
  │   │   │   └── index.ts    (HTTP handlers)
  │   │   ├── service/
  │   │   │   └── index.ts    (Business logic)
  │   │   └── dto/
  │   │       └── index.ts    (Type contracts)
  │   │
  │   ├── pos/
  │   ├── inventory/
  │   ├── warehouse/
  │   ├── fleet/
  │   ├── hr/
  │   └── finance/
  │
  ├── routes/
  │   └── index.ts            (Route registration)
  │
  ├── app.ts                  (Express setup)
  ├── index.ts                (Entry point)
  │
  └── prisma/
      └── schema.prisma       (Data models)

Frontend:
  ├── app/
  │   ├── page.tsx            (Root redirect)
  │   ├── layout.tsx          (Root layout + provider)
  │   │
  │   ├── auth/
  │   │   └── login/
  │   │       └── page.tsx    (Login page)
  │   │
  │   └── dashboard/
  │       ├── layout.tsx      (Protected wrapper)
  │       └── page.tsx        (Dashboard home)
  │
  ├── components/
  │   ├── ui/
  │   │   ├── button.tsx      (Button component)
  │   │   ├── input.tsx       (Input component)
  │   │   ├── form.tsx        (Form wrapper)
  │   │   └── card.tsx        (Card component)
  │   │
  │   └── sidebar.tsx         (Navigation)
  │
  ├── lib/
  │   ├── auth-context.tsx    (Auth provider)
  │   ├── api-client.ts       (API communication)
  │   └── utils.ts            (Utilities)
  │
  └── public/                 (Static files)
```

---

## 🔄 Role-Based Authorization Flow

```
               User makes request
                      │
                      ▼
         ┌────────────────────────┐
         │  authMiddleware()      │
         │  Verify JWT token      │
         │  Extract user role     │
         └──────────┬─────────────┘
                    │
                    ▼ (user attached to req)
         ┌────────────────────────┐
         │  Endpoint routing      │
         │  Check required role   │
         └──────────┬─────────────┘
                    │
         ┌──────────┴──────────┬──────────┐
         │                     │          │
    No middleware         roleMiddleware  │
    (all users)           (specific)      │
         │                     │          │
         ▼                     ▼          ▼
    ┌────────┐    ┌──────────────────┐  │
    │ Allow  │    │ Check role in    │  │
    │ Access │    │ allowedRoles []  │  │
    └────────┘    └────────┬─────────┘  │
                           │            │
                   ┌───────┴──────┐     │
                   │              │     │
               In list         Not in   │
               (Allowed)      (Forbidden)
                   │              │     │
                   ▼              ▼     │
               ┌────────┐    ┌────────┐ │
               │ Allow  │    │ 403    │ │
               │ Access │    │ Error  │ │
               └────────┘    └────────┘ │
                                        │
         ┌──────────────────────────────┘
         │
         ▼
    Controller Handler
         │
         ▼
    Execute Business Logic
         │
    ┌────┴────┐
    │          │
 Success     Error
    │          │
    ▼          ▼
  Return    Error
  Response   Response
```

---

## 📊 Database Schema

```
┌─────────────────────────┐
│ User                    │
├─────────────────────────┤
│ id (String, PK)         │
│ email (String, Unique)  │
│ passwordHash (String)   │
│ name (String)           │
│ role (String, Default)  │
│ createdAt (DateTime)    │
│ updatedAt (DateTime)    │
└─────────────────────────┘

Example data:
┌─────┬──────────────────┬─────────────────────┬──────────┬─────────┐
│ id  │ email            │ passwordHash        │ name     │ role    │
├─────┼──────────────────┼─────────────────────┼──────────┼─────────┤
│ u1  │ admin@ex.com     │ $2b$10$hash...      │ Admin    │ admin   │
│ u2  │ manager@ex.com   │ $2b$10$hash...      │ Manager  │ manager │
│ u3  │ user@ex.com      │ $2b$10$hash...      │ User     │ user    │
└─────┴──────────────────┴─────────────────────┴──────────┴─────────┘
```

---

**All diagrams are machine-generated and production-ready!** ✅
