# Frontend Development Guide

## Setting Up the Frontend

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Environment Setup

Create `.env.local` from the template:

```bash
cp .env.example .env.local
```

Configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
NODE_ENV=development
```

### Development Server

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Check code quality |
| `npm run lint:fix` | Fix linting issues |
| `npm run type-check` | Run TypeScript compiler |
| `npm run format` | Format code with Prettier |

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global styles
├── public/               # Static assets
├── .env.example          # Environment template
├── next.config.ts        # Next.js configuration
├── tsconfig.json         # TypeScript configuration
├── .eslintrc.json        # ESLint rules
├── .prettierrc.json      # Prettier formatting
└── package.json
```

## Key Features

### API Proxy

All `/api/*` requests are automatically proxied to the backend:

```typescript
// This request goes to http://localhost:5000/api/health
const response = await fetch('/api/health');
const data = await response.json();
```

Configuration in `next.config.ts`:
```typescript
rewrites: async () => {
  return {
    beforeFiles: [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ],
  };
}
```

### TypeScript Strict Mode

The frontend uses strict TypeScript settings:
- All types must be explicit
- No implicit `any`
- No unused variables
- Strict null checking

## Code Quality

### Linting with ESLint

```bash
npm run lint              # Check for issues
npm run lint:fix          # Auto-fix issues
```

Configuration: `.eslintrc.json`

### Code Formatting with Prettier

```bash
npm run format            # Format all files
```

Configuration: `.prettierrc.json`

### Type Checking

```bash
npm run type-check        # Verify TypeScript types
```

## Creating Pages

New pages go in `app/` directory using the App Router:

```typescript
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
    </div>
  );
}
```

Automatically creates route `/dashboard`

## API Integration Example

```typescript
// app/page.tsx
'use client';

import { useEffect, useState } from 'react';

interface HealthResponse {
  status: string;
  timestamp: string;
  environment: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data));
  }, []);

  return (
    <main>
      <h1>Zoho ERP</h1>
      {health && <p>Backend Status: {health.status}</p>}
    </main>
  );
}
```

## Styling

This project uses Tailwind CSS v4. Update `app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-primary: #3b82f6;
}

body {
  @apply bg-gray-50;
}
```

## Adding Dependencies

```bash
npm install package-name --workspace=frontend
```

Development dependency:
```bash
npm install --save-dev package-name --workspace=frontend
```

## Building

### Development Build
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

Build output goes to `.next/` directory

## Deployment

### To Vercel (Recommended)

```bash
npm install -g vercel
vercel deploy
```

### To Self-Hosted Server

1. **Build**
   ```bash
   npm run build
   ```

2. **Deploy `.next` folder** and `public/` to server

3. **Start on server**
   ```bash
   npm start
   ```

Environment variables for production:
```env
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
NODE_ENV=production
```

## Common Issues

### Port 3000 Already in Use
```bash
# Use a different port
npm run dev -- -p 3001
```

### Module Not Found
```bash
npm install
npm run build
```

### TypeScript Errors
```bash
npm run type-check
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## Performance Tips

1. **Use dynamic imports** for code splitting:
   ```typescript
   import dynamic from 'next/dynamic';
   const Component = dynamic(() => import('./Component'));
   ```

2. **Optimize images**:
   ```typescript
   import Image from 'next/image';
   ```

3. **Enable compression** in `next.config.ts`

4. **Monitor Core Web Vitals** with WebVitals
