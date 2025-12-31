# Backend Development Guide

## Setting Up the Backend

### Prerequisites

- Node.js 18+
- PostgreSQL 12+
- Git

### Installation

```bash
cd backend
npm install
```

### Database Setup

1. **Create a PostgreSQL database:**

   ```bash
   createdb zoho_erp_dev
   ```

2. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your database connection string:

   ```env
   DATABASE_URL="postgresql://localhost/zoho_erp_dev"
   ```

3. **Push Prisma schema:**

   ```bash
   npm run db:push
   ```

4. **View/Manage database:**
   ```bash
   npm run db:studio
   ```

### Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

### Available Endpoints

- `GET /api/health` - Health check
- `GET /api/data` - Sample data endpoint

### Scripts

| Command              | Description                              |
| -------------------- | ---------------------------------------- |
| `npm run dev`        | Start development server with hot reload |
| `npm run build`      | Build TypeScript to JavaScript           |
| `npm start`          | Run production server                    |
| `npm run lint`       | Check code quality                       |
| `npm run lint:fix`   | Fix linting issues                       |
| `npm run type-check` | Run TypeScript compiler                  |
| `npm run db:push`    | Push Prisma schema to database           |
| `npm run db:migrate` | Create and run migrations                |
| `npm run db:studio`  | Open Prisma Studio UI                    |

## Database Migrations

### Create a new migration

```bash
npm run db:migrate
```

You'll be prompted to name the migration. Example:

```bash
? Enter a name for the new migration: › add_user_table
```

### Prisma Schema Structure

Database models are defined in `prisma/schema.prisma`:

```prisma
model User {
  id        Int     @id @default(autoincrement())
  email     String  @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## Project Structure

```
backend/
├── src/
│   └── index.ts          # Main application entry
├── prisma/
│   ├── schema.prisma     # Database schema
│   └── migrations/       # Migration files
├── dist/                 # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json         # TypeScript configuration
├── .eslintrc.json        # ESLint rules
├── .env.example          # Environment template
└── README.md
```

## TypeScript Configuration

The backend uses strict TypeScript settings (`tsconfig.json`):

- All types must be explicit
- No implicit `any`
- No unused variables or parameters
- Strict null checking
- Full type inference

## Code Quality

### Linting with ESLint

```bash
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
```

Configuration: `.eslintrc.json`

### Type Checking

```bash
npm run type-check        # Verify TypeScript types
```

## Adding Dependencies

```bash
npm install package-name --workspace=backend
```

Development dependency:

```bash
npm install --save-dev package-name --workspace=backend
```

## Authentication & JWT

Update `src/index.ts` to add JWT middleware:

```typescript
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

// Verify token middleware
app.use((req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, SECRET);
      (req as any).user = decoded;
    } catch (err) {
      // Token invalid
    }
  }
  next();
});
```

## Common Issues

### Port Already in Use

```bash
# Kill process on port 5000 (Linux/Mac)
lsof -ti:5000 | xargs kill -9

# Or use a different port
PORT=5000 npm run dev
```

### Database Connection Failed

- Verify PostgreSQL is running
- Check DATABASE_URL in `.env`
- Ensure database exists

### Prisma Schema Validation

```bash
npx prisma validate
```

## Production Deployment

1. **Build**

   ```bash
   npm run build
   ```

2. **Set environment variables** on the server
3. **Push database schema**

   ```bash
   npm run db:push
   ```

4. **Start server**
   ```bash
   npm start
   ```

Environment variables for production:

```env
NODE_ENV=production
DATABASE_URL="postgresql://prod-user:prod-password@prod-host:5432/zoho_erp"
JWT_SECRET="your-production-secret-key"
CORS_ORIGIN="https://yourdomain.com"
```
