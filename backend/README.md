# Zoho ERP Backend

A robust Node.js + TypeScript backend API for the Zoho ERP system built with Express and Prisma.

## Prerequisites

- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Setup environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

   Add `FRONTEND_URLS` to configure allowed CORS origins as a comma-separated list, for example:

   ```bash
   # Allow localhost and production frontend
   FRONTEND_URLS="http://localhost:3000,https://app.example.com"
   ```

3. **Setup database**
   ```bash
   npm run db:push
   # or run migrations
   npm run db:migrate
   ```

## Development

```bash
npm run dev
```

The server will start on `http://localhost:5000`

## Building

```bash
npm run build
npm start
```

## Database Management

- **View data**: `npm run db:studio`
- **Push schema**: `npm run db:push`
- **Create migration**: `npm run db:migrate`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/data` - Sample endpoint

## Linting

```bash
npm run lint
npm run lint:fix
npm run type-check
```
