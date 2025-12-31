# Quick Start - JWT Authentication Setup

Get your authentication system running in minutes!

## ⚡ 5-Minute Quick Start

### Backend Setup (5 min)

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies (includes jsonwebtoken & bcrypt)
npm install

# 3. Set up environment
cp .env.example .env

# 4. Update .env with your PostgreSQL URL
# DATABASE_URL="postgresql://user:password@localhost:5432/zoho_erp"
# JWT_SECRET="your-secret-key"

# 5. Add User model to prisma/schema.prisma (see PRISMA_SCHEMA_SETUP.md)

# 6. Run migration
npm run db:migrate -- --name add_user_authentication

# 7. Start backend
npm run dev
# → Server running at http://localhost:5000
```

### Frontend Setup (3 min)

```bash
# 1. Navigate to frontend (in new terminal)
cd frontend

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.local.example .env.local

# 4. Start frontend
npm run dev
# → App running at http://localhost:3000
```

### Test the System (2 min)

```bash
# 1. In browser, go to http://localhost:3000
# → Auto-redirects to http://localhost:3000/auth/login

# 2. Register new user
# - Click "Sign up" link
# - Fill form: email, password, name
# - Submit

# 3. Or use demo credentials
# Email: demo@example.com
# Password: password123
# (Create this via API or database)

# 4. After login
# → Dashboard loads
# → Sidebar shows based on role
# → Token stored in localStorage
```

---

## 📋 Files You Need to Know

### Backend

```
backend/
├── src/common/
│   ├── jwt.ts              ← Token management
│   ├── password.ts         ← Password hashing
│   └── auth.ts             ← Middleware
├── src/modules/auth/
│   ├── controller/
│   ├── service/
│   └── dto/
├── src/routes/index.ts     ← Auth endpoints registered
├── package.json            ← JWT & bcrypt added
└── JWT_AUTH_SYSTEM.md      ← Full documentation
```

### Frontend

```
frontend/
├── lib/
│   ├── auth-context.tsx    ← State management
│   ├── api-client.ts       ← API communication
│   └── utils.ts            ← Helpers
├── components/
│   ├── ui/                 ← shadcn components
│   └── sidebar.tsx         ← Navigation
├── app/
│   ├── auth/login/page.tsx ← Login page
│   ├── dashboard/          ← Protected routes
│   └── layout.tsx          ← AuthProvider
└── package.json            ← UI dependencies added
```

---

## 🔑 Key Endpoints

### Public (No Auth Required)

```bash
# Register
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name",
  "role": "user"
}

# Login
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

# Response includes: { token, user }
```

### Protected (Requires JWT in Authorization Header)

```bash
# Get current user
GET /auth/me
Authorization: Bearer <token>

# Update profile
PATCH /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Name"
}
```

---

## 🎨 Frontend Flow

```
http://localhost:3000
        ↓
    [Redirect]
        ↓
http://localhost:3000/auth/login
        ↓
    [User enters email/password]
        ↓
    POST /auth/login
        ↓
    [Get token + user data]
        ↓
    [Save to localStorage]
        ↓
    [Update AuthContext]
        ↓
http://localhost:3000/dashboard
        ↓
    [Sidebar shows based on role]
        ↓
    [All requests include JWT token]
```

---

## 🔐 Roles & Permissions

### User Roles

- **admin**: Full access to all features
- **manager**: Operations & reporting
- **user**: Read-only access to relevant data

### Dashboard Access

```
All Roles:
  - Dashboard (home)
  - Sales (view)
  - Inventory (view)

Manager & Admin:
  - Warehouse
  - Fleet
  - Employees
  - Finance

Admin Only:
  - Settings
```

---

## 🔧 Environment Variables

### Backend (.env)

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/zoho_erp"
JWT_SECRET="your-super-secret-key-minimum-32-chars-recommended"
JWT_EXPIRY="24h"
PORT=5000
NODE_ENV="development"
FRONTEND_URL="http://localhost:3000"
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## ✅ Checklist

Before you start:

- [ ] PostgreSQL is running
- [ ] Node.js 18+ installed
- [ ] npm or yarn available
- [ ] Port 3000 available (frontend)
- [ ] Port 5000 available (backend)

During setup:

- [ ] Backend: `npm install` succeeded
- [ ] Backend: `.env` file created
- [ ] Backend: `npm run db:migrate` succeeded
- [ ] Frontend: `npm install` succeeded
- [ ] Frontend: `.env.local` file created

After startup:

- [ ] Backend: http://localhost:5000/health returns 200
- [ ] Frontend: http://localhost:3000 redirects to login
- [ ] Can register new user via API or frontend
- [ ] Can login with credentials
- [ ] Dashboard loads after login
- [ ] Sidebar shows navigation based on role

---

## 🐛 Quick Troubleshooting

| Problem                     | Solution                                         |
| --------------------------- | ------------------------------------------------ |
| Port 5000 in use            | `lsof -i :5000` then `kill -9 <PID>`             |
| Port 3000 in use            | `lsof -i :3000` then `kill -9 <PID>`             |
| Database connection error   | Check DATABASE_URL in .env and PostgreSQL status |
| "Cannot find module" errors | Run `npm install` again in both directories      |
| JWT secret mismatch         | Ensure JWT_SECRET matches between .env and code  |
| CORS errors                 | Check FRONTEND_URL in backend .env               |
| Token not persisting        | Clear localStorage and re-login                  |

---

## 📚 Full Documentation

- Backend Auth: `JWT_AUTH_SYSTEM.md`
- Prisma Setup: `PRISMA_SCHEMA_SETUP.md`
- Backend Architecture: `BACKEND_SCAFFOLDING.md`

---

## 🚀 You're Ready!

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Visit http://localhost:3000 in your browser
```

**Happy coding!** 🎉
