# NPM Scripts Reference

**Backend Development Command Reference**

---

## 🚀 Running the Server

### Development (with auto-reload)

```bash
npm run dev
```

- Runs `tsx watch src/index.ts`
- Auto-reloads on file changes
- Useful for active development

**Example Output**:

```
🚀 Starting ERP Backend Server...
📝 Environment: development
✅ Database connected successfully
✅ Server running on http://localhost:5000
🔗 Health check: http://localhost:5000/health
📚 API docs: http://localhost:5000/v1
```

### Production Start

```bash
npm start
```

- Runs precompiled JavaScript (`dist/src/index.js`)
- Must run `npm run build` first
- Use in Docker or production environments

---

## 🏗️ Building & Compilation

### Build TypeScript

```bash
npm run build
```

- Compiles TypeScript to JavaScript
- Output goes to `dist/` directory
- Use before `npm start`

### Type Check (without build)

```bash
npm run type-check
```

- Checks TypeScript syntax
- Doesn't compile code
- Fast verification

---

## 📝 Code Quality

### Lint Code

```bash
npm run lint
```

- Check for ESLint violations
- Shows errors without fixing

### Fix Linting Issues

```bash
npm run lint:fix
```

- Automatically fixes ESLint issues
- May require manual review for complex issues

### Format Code

```bash
npm run format
```

- Uses Prettier for code formatting
- Ensures consistent code style
- Works on all TypeScript files in `src/`

---

## 🗄️ Database Management

### Create & Apply Migrations

```bash
npm run db:migrate -- --name "description"
```

- Detects schema changes
- Creates migration file
- Applies to database immediately
- Generates Prisma Client

**Examples**:

```bash
npm run db:migrate -- --name "create_users_table"
npm run db:migrate -- --name "add_email_field_to_user"
npm run db:migrate -- --name "create_inventory_index"
```

### Push Changes Directly

```bash
npm run db:push
```

- Pushes schema directly to database
- Faster than migrations
- Use for rapid development iteration

### Open Prisma Studio

```bash
npm run db:studio
```

- Opens browser at `http://localhost:5555`
- Visual database explorer
- Create/edit/view records
- Great for testing

### Reset Database (Development Only!)

```bash
npm run db:reset
```

⚠️ **WARNING**: Deletes all data!

- Drops database
- Recreates from schema
- Runs all migrations
- Never use in production

### Generate Prisma Client

```bash
npm run db:generate
```

- Regenerates Prisma Client
- Useful after Prisma version updates
- Usually runs automatically

---

## 📋 Quick Commands by Use Case

### "I want to start developing"

```bash
npm run db:migrate -- --name "init_schema"  # First time only
npm run dev
```

### "I modified the schema"

```bash
npm run db:migrate -- --name "describe_change"
# Server auto-reloads
```

### "Code has lint errors"

```bash
npm run lint:fix
npm run format
```

### "I want to check for type errors"

```bash
npm run type-check
```

### "I need to deploy to production"

```bash
npm run build
npm start
```

### "I want to view/edit database"

```bash
npm run db:studio
```

### "I messed up and need to start fresh"

```bash
npm run db:reset
npm run dev
```

---

## 🔧 Package.json Scripts Details

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "start": "node dist/src/index.js",
    "build": "tsc",
    "lint": "eslint src/**/*.ts",
    "lint:fix": "eslint src/**/*.ts --fix",
    "type-check": "tsc --noEmit",
    "format": "prettier --write \"src/**/*.ts\"",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset",
    "db:generate": "prisma generate"
  }
}
```

---

## 💡 Tips & Tricks

### Run multiple commands

```bash
# Windows
npm run build && npm start

# Mac/Linux
npm run build && npm start
```

### Watch only (no server start)

```bash
tsx watch src/index.ts --no-exec
```

### Type check and lint before committing

```bash
npm run type-check && npm run lint:fix && npm run format
```

### Quick health check

```bash
curl http://localhost:5000/health | jq
```

### View real-time logs

```bash
npm run dev 2>&1 | tee development.log
```

---

## 🐛 Troubleshooting Scripts

### "TypeScript errors in production build"

```bash
npm run type-check  # Find issues
npm run lint:fix    # Fix what you can
```

### "Port 5000 is already in use"

```bash
PORT=5000 npm run dev
```

### "Prisma Client out of sync"

```bash
npm run db:generate
```

### "Database won't migrate"

```bash
npx prisma migrate status  # Check status
npx prisma db push         # Force push
```

---

## 📊 Dependencies Used

| Script       | Tools            | Purpose                |
| ------------ | ---------------- | ---------------------- |
| `dev`        | tsx              | Development hot reload |
| `start`      | Node.js          | Production server      |
| `build`      | tsc (TypeScript) | Compile to JavaScript  |
| `lint`       | ESLint           | Find code issues       |
| `lint:fix`   | ESLint           | Auto-fix code          |
| `format`     | Prettier         | Code formatting        |
| `type-check` | tsc              | Type validation        |
| `db:*`       | Prisma           | Database operations    |

---

## ✅ Common Workflows

### New Feature Development

```bash
# 1. Start dev server
npm run dev

# 2. Make schema changes (in another terminal)
npm run db:migrate -- --name "feature_name"

# 3. Code the feature
# (Auto-reload happens)

# 4. Before commit
npm run lint:fix && npm run format
npm run type-check
```

### Code Review

```bash
# Check for issues
npm run lint
npm run type-check

# Auto-fix what you can
npm run lint:fix
npm run format
```

### Deployment

```bash
# Verify everything
npm run type-check
npm run lint
npm run build

# Deploy
npm start
```

---

## 🚨 Important Notes

- ✅ Always run `npm run db:migrate` after schema changes
- ✅ Use `npm run db:studio` to verify data
- ✅ Run `npm run type-check` before committing
- ✅ Use `npm run db:reset` only in development
- ⚠️ Never run `npm run db:reset` on production database!
- ⚠️ Always test `npm run build` before deployment

---

**Happy Coding! 🎉**
