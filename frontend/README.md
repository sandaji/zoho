# Zoho ERP Frontend

A modern Next.js 16 frontend for the Zoho ERP system with strict TypeScript and API proxy to backend.

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Setup environment variables**
   ```bash
   cp .env.example .env.local
   ```

## Development

```bash
npm run dev
```

The frontend will start on `http://localhost:3000`

API requests to `/api/*` are proxied to `http://localhost:5000`

## Building

```bash
npm run build
npm start
```

## Type Checking & Linting

```bash
npm run type-check
npm run lint
npm run lint:fix
npm run format
```

## Features

- ✅ Next.js 16 with App Router
- ✅ Strict TypeScript configuration
- ✅ API proxy to backend on `/api/*`
- ✅ ESLint and Prettier integration
- ✅ Security headers configured
- ✅ Tailwind CSS with PostCSS

## API Integration

All API calls should use the `/api/*` path:

```typescript
const response = await fetch('/api/health');
const data = await response.json();
```

This will be automatically proxied to `http://localhost:5000/api/health`
