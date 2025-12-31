# ✅ Team Onboarding Checklist

**Project**: Zoho ERP Monorepo  
**Date**: November 12, 2025  
**Version**: 1.0.0

---

## 👋 Welcome to the Team!

Use this checklist to get yourself set up and familiar with the project. Estimated time: **30 minutes**

---

## 🚀 Day 1: Setup & Running

### Step 1: Clone/Access Repository

- [ ] Navigate to `c:\Projects\zoho`
- [ ] Verify folder exists with `frontend/`, `backend/`, and `package.json`
- [ ] Read `COMPLETE_SETUP_SUMMARY.md` (10 minutes)

### Step 2: Install Dependencies

- [ ] Open terminal in project root
- [ ] Run: `npm install`
- [ ] Wait for completion (~2 minutes)
- [ ] No errors? ✅

### Step 3: Start Docker

- [ ] Run: `docker-compose up -d`
- [ ] Verify: `docker-compose ps` shows PostgreSQL and Redis running
- [ ] Check PostgreSQL is healthy

### Step 4: Setup Backend Environment

- [ ] Copy `backend/.env.example` to `backend/.env`
- [ ] Verify `DATABASE_URL` is set correctly
- [ ] Verify `JWT_SECRET` is set
- [ ] Check `PORT=5000`

### Step 5: Run Database Migration

- [ ] Open terminal in `backend/` folder
- [ ] Run: `npm run db:migrate -- --name init_erp_schema`
- [ ] Wait for migration to complete
- [ ] Verify: "Migration... applied successfully"

### Step 6: Start Backend Server

- [ ] In `backend/` folder, run: `npm run dev`
- [ ] Wait for "Server running on http://localhost:5000"
- [ ] Test health endpoint: `curl http://localhost:5000/api/health`
- [ ] Should see JSON response with status

### Step 7: Start Frontend Server

- [ ] Open new terminal in `frontend/` folder
- [ ] Run: `npm run dev`
- [ ] Wait for "ready - started server on..."
- [ ] Open http://localhost:3000 in browser
- [ ] Should see Next.js page

### Step 8: View Database

- [ ] In `backend/` folder, run: `npm run db:studio`
- [ ] Open http://localhost:5555 in browser
- [ ] Should see Prisma Studio with all tables
- [ ] Explore the schema

**Status**: ✅ Project is running!

---

## 📚 Day 1: Understanding the Project

### Read Documentation

- [ ] `DOCUMENTATION_INDEX.md` - Understand documentation structure (5 min)
- [ ] `MONOREPO.md` - Understand project structure (10 min)
- [ ] Your role-specific docs:
  - [ ] Backend Dev? → `backend/DEVELOPMENT.md`
  - [ ] Frontend Dev? → `frontend/DEVELOPMENT.md`
  - [ ] DevOps? → `docker-compose.yml` and `.github/workflows/`
  - [ ] Database? → `backend/SCHEMA_FIELD_REFERENCE.md`

### Understand the Tech Stack

- [ ] **Frontend**: Next.js 16 + React 19 + TypeScript 5
- [ ] **Backend**: Express 4 + Node.js + TypeScript 5
- [ ] **Database**: PostgreSQL 15 + Prisma ORM
- [ ] **Infrastructure**: Docker + GitHub Actions

### Understand the Schema

- [ ] Read: `backend/SCHEMA_FIELD_REFERENCE.md` (15 min)
- [ ] Understand the 10 core models:
  1. User (employees)
  2. Branch (locations)
  3. Warehouse (storage)
  4. Product (inventory)
  5. Inventory (stock levels)
  6. Sales (orders)
  7. SalesItem (order items)
  8. Truck (vehicles)
  9. Delivery (shipments)
  10. FinanceTransaction (accounting)
  11. Payroll (compensation)

**Status**: ✅ You understand the project!

---

## 💻 Day 2: Your First Task

### Backend Developer

- [ ] Create a new file: `backend/src/routes/products.ts`
- [ ] Use TypeScript from `backend/src/types/index.ts`
- [ ] Create GET `/api/products` endpoint
- [ ] Test with Postman or curl
- [ ] See: `backend/DEVELOPMENT.md` for patterns

### Frontend Developer

- [ ] Create a new page: `frontend/app/products/page.tsx`
- [ ] Add navigation to new page
- [ ] Fetch from backend via proxy
- [ ] Display data in a table
- [ ] See: `frontend/DEVELOPMENT.md` for patterns

### Database Developer

- [ ] Read: `backend/SCHEMA_FIELD_REFERENCE.md`
- [ ] Understand all 10 models and 6 enums
- [ ] Plan first schema change
- [ ] See: `backend/MIGRATION_COMMANDS.md` for commands

### DevOps Engineer

- [ ] Review: `docker-compose.yml`
- [ ] Review: `.github/workflows/lint-and-build.yml`
- [ ] Review: `.github/workflows/backend-tests.yml`
- [ ] Understand deployment strategy
- [ ] Plan any infrastructure changes

**Status**: ✅ You've made your first contribution!

---

## 🎓 Knowledge Base

### Essential Commands

```bash
# Backend
npm run dev --workspace=backend           # Start backend
npm run lint --workspace=backend          # Check code
npm run type-check --workspace=backend    # Check types

# Frontend
npm run dev --workspace=frontend          # Start frontend
npm run build --workspace=frontend        # Build for production

# Database
npm run db:migrate -- --name "description"  # Create migration
npm run db:push                             # Apply migration
npm run db:studio                           # View data

# Docker
docker-compose up -d                      # Start services
docker-compose down                       # Stop services
docker-compose ps                         # View status
```

### Key Files

| File                           | Purpose          |
| ------------------------------ | ---------------- |
| `backend/prisma/schema.prisma` | Database schema  |
| `backend/src/types/index.ts`   | TypeScript types |
| `backend/src/index.ts`         | Express server   |
| `frontend/next.config.ts`      | API proxy config |
| `docker-compose.yml`           | Docker services  |

### Key Documentation

| File                        | Purpose           |
| --------------------------- | ----------------- |
| `COMPLETE_SETUP_SUMMARY.md` | Project overview  |
| `MIGRATION_COMMANDS.md`     | Database commands |
| `SCHEMA_FIELD_REFERENCE.md` | Schema details    |
| `backend/DEVELOPMENT.md`    | Backend patterns  |
| `frontend/DEVELOPMENT.md`   | Frontend patterns |

---

## 🔐 Security Guidelines

### Before Committing

- [ ] Don't commit `.env` file (use `.env.example`)
- [ ] Don't commit API keys or secrets
- [ ] Don't commit `node_modules/`
- [ ] Don't commit `.next/` or `dist/`

### Code Guidelines

- [ ] Use TypeScript strict mode
- [ ] Add proper error handling
- [ ] Validate user input
- [ ] Use type-safe database queries

### Database Guidelines

- [ ] Use migrations for schema changes
- [ ] Test migrations locally first
- [ ] Never modify migration files
- [ ] Verify constraints and indexes

---

## 📋 Communication

### Where to Find Info

- **Documentation**: Start with `DOCUMENTATION_INDEX.md`
- **Troubleshooting**: Check `MIGRATION_COMMANDS.md` troubleshooting section
- **Architecture**: See `MONOREPO.md` and `VISUAL_REFERENCE.md`
- **Code Patterns**: See `backend/DEVELOPMENT.md` and `frontend/DEVELOPMENT.md`

### How to Ask Questions

1. Check relevant documentation file first
2. Check if similar issue in troubleshooting section
3. Review existing code examples
4. Ask team lead with context

---

## 🎯 Your Role Path

### If You're a Backend Developer

**Essential Reads**:

1. ✅ `COMPLETE_SETUP_SUMMARY.md` (overview)
2. ✅ `backend/DEVELOPMENT.md` (patterns & setup)
3. ✅ `backend/SCHEMA_FIELD_REFERENCE.md` (database schema)
4. ✅ `backend/src/types/index.ts` (TypeScript types)

**First Task**:

- Create a GET endpoint for products
- Test with database query
- Return JSON response
- Add TypeScript types

**Resources**:

- `backend/MIGRATION_COMMANDS.md` - Database operations
- `backend/src/types/index.ts` - Type definitions
- Prisma docs - Complex queries

---

### If You're a Frontend Developer

**Essential Reads**:

1. ✅ `COMPLETE_SETUP_SUMMARY.md` (overview)
2. ✅ `frontend/DEVELOPMENT.md` (patterns & setup)
3. ✅ `next.config.ts` (API proxy)
4. ✅ `backend/SCHEMA_FIELD_REFERENCE.md` (API data models)

**First Task**:

- Create a new page component
- Fetch data from backend via proxy
- Display data in UI
- Add loading/error states

**Resources**:

- Next.js docs - Framework
- Tailwind CSS docs - Styling
- `backend/SCHEMA_FIELD_REFERENCE.md` - API models

---

### If You're a DevOps/Infra Engineer

**Essential Reads**:

1. ✅ `COMPLETE_SETUP_SUMMARY.md` (overview)
2. ✅ `MONOREPO.md` (structure)
3. ✅ `docker-compose.yml` (infrastructure)
4. ✅ `.github/workflows/` (CI/CD)

**First Task**:

- Understand deployment process
- Setup staging environment
- Configure DNS/networking
- Monitor logs

**Resources**:

- Docker docs
- GitHub Actions docs
- PostgreSQL docs

---

### If You're a Database Engineer

**Essential Reads**:

1. ✅ `COMPLETE_SETUP_SUMMARY.md` (overview)
2. ✅ `backend/SCHEMA_FIELD_REFERENCE.md` (complete schema)
3. ✅ `backend/PRISMA_MIGRATION_GUIDE.md` (advanced guide)
4. ✅ `backend/MIGRATION_COMMANDS.md` (commands)

**First Task**:

- Understand all 10 models
- Review relationships
- Plan first feature
- Create migration

**Resources**:

- Prisma docs
- PostgreSQL docs
- `backend/src/types/index.ts` - TypeScript types

---

## ✅ Readiness Checklist

### Before Starting Work

- [ ] All dependencies installed (`npm install`)
- [ ] Docker running (`docker-compose ps`)
- [ ] Database migrated (ran `db:migrate`)
- [ ] Backend running (`npm run dev`)
- [ ] Frontend running (`npm run dev`)
- [ ] Prisma Studio accessible
- [ ] No TypeScript errors (`npm run type-check`)

### Before Committing Code

- [ ] Code passes lint check
- [ ] No TypeScript errors
- [ ] Tests pass (if applicable)
- [ ] No console errors/warnings
- [ ] Documentation updated (if needed)
- [ ] No `.env` files committed

### Before Creating PR

- [ ] Tests written (if applicable)
- [ ] Documentation updated
- [ ] Code reviewed locally
- [ ] No breaking changes
- [ ] Database migration tested

---

## 🚀 First Week Goals

### Day 1-2

- [ ] Setup complete and running
- [ ] Project structure understood
- [ ] Read role-specific documentation
- [ ] One small PR (improvement or fix)

### Day 3-4

- [ ] Implement first feature/endpoint
- [ ] Understand code review process
- [ ] Learn testing procedures
- [ ] Second PR completed

### Day 5

- [ ] Review & merge first features
- [ ] Plan next sprint
- [ ] Ask questions/clarifications
- [ ] Celebrate! 🎉

---

## 📊 Success Criteria

**By End of Week 1, You Should**:

- ✅ Have project running locally
- ✅ Understand the architecture
- ✅ Have made 2-3 contributions
- ✅ Be comfortable with development workflow
- ✅ Know where to find information
- ✅ Understand your role responsibilities

---

## 🆘 Troubleshooting Quick Reference

### "Cannot reach database"

```bash
# Check Docker
docker-compose ps

# Restart
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### "TypeScript errors"

```bash
# Check types
npm run type-check --workspace=backend

# Check schema
npx prisma validate
```

### "Migration failed"

```bash
# Check status
npx prisma migrate status

# See troubleshooting
# Check: backend/MIGRATION_COMMANDS.md
```

### "Port already in use"

```bash
# Change port in .env or code
# Or kill existing process
# Or run on different machine
```

---

## 📞 Getting Help

**Issues**:

1. Check `DOCUMENTATION_INDEX.md` for navigation
2. Search relevant documentation file
3. Check troubleshooting sections
4. Ask team lead with context

**Common Issues**:

- `MIGRATION_COMMANDS.md` - Database troubleshooting
- `backend/DEVELOPMENT.md` - Backend patterns
- `frontend/DEVELOPMENT.md` - Frontend patterns
- `PROJECT_STATUS.md` - Project overview

---

## 🎓 Next Steps

1. **Complete this checklist** (30 minutes)
2. **Read role-specific docs** (1 hour)
3. **Make first contribution** (1-2 hours)
4. **Celebrate** 🎉

---

## 📝 Notes

**Your Name**: **\*\***\_\_\_\_**\*\***  
**Role**: **\*\***\_\_\_\_**\*\***  
**Start Date**: November 12, 2025  
**Mentor**: **\*\***\_\_\_\_**\*\***

**Onboarding Date Completed**: \***\*\_\_\_\_\*\***

---

## 🎉 Final Checklist

- [ ] All above items completed
- [ ] Project running locally
- [ ] Documentation understood
- [ ] First contribution made
- [ ] Welcome to the team! 🚀

---

**Document**: Team Onboarding Checklist  
**Version**: 1.0.0  
**Last Updated**: November 12, 2025  
**Status**: ✅ Complete

**Welcome aboard! Let's build something amazing together! 🎉**
