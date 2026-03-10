# Zoho ERP

A comprehensive Enterprise Resource Planning (ERP) system built with Next.js, TypeScript, and PostgreSQL.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 15+
- npm 9+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sandaji/zoho.git
   cd zoho
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Edit backend/.env with your database credentials
   
   # Frontend
   cp frontend/.env.local.example frontend/.env.local
   # Edit frontend/.env.local if needed
   ```

4. **Set up the database**
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start both frontend (http://localhost:3000) and backend (http://localhost:3001) servers.

## 🐳 Docker Development

### Using Docker Compose

1. **Start all services**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

2. **Stop all services**
   ```bash
   docker-compose -f docker-compose.dev.yml down
   ```

3. **View logs**
   ```bash
   docker-compose -f docker-compose.dev.yml logs -f
   ```

### Production Deployment

1. **Build and start production services**
   ```bash
   docker-compose up -d
   ```

## 📁 Project Structure

```
zoho/
├── frontend/          # Next.js frontend application
│   ├── components/    # React components
│   ├── app/          # Next.js app router pages
│   ├── lib/          # Utility functions and API clients
│   └── tests/        # Frontend tests
├── backend/           # Node.js/Express backend API
│   ├── src/
│   │   ├── modules/  # Feature modules
│   │   ├── middleware/ # Express middleware
│   │   └── lib/      # Utility functions
│   ├── prisma/       # Database schema and migrations
│   └── tests/        # Backend tests
└── docker-compose.yml # Docker configuration
```

## 🧪 Testing

### Backend Tests
```bash
npm run test:backend
```

### Frontend Tests
```bash
npm run test:frontend
```

### All Tests
```bash
npm run test
```

### Test Coverage
```bash
# Backend
cd backend && npm run test -- --coverage

# Frontend
cd frontend && npm run test -- --coverage
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development
- `npm run build` - Build both frontend and backend
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run type-check` - Type check all code

### Backend
- `npm run dev:backend` - Start backend development server
- `npm run build:backend` - Build backend
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

### Frontend
- `npm run dev:frontend` - Start frontend development server
- `npm run build:frontend` - Build frontend

## 📝 Environment Variables

### Backend (.env)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret (min 32 characters)
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `NODE_ENV` - Environment (development/production/test)
- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Allowed CORS origin

### Frontend (.env.local)
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_APP_URL` - Frontend URL
- `NEXT_PUBLIC_API_BASE_URL` - API base URL

## 🔒 Security

- All secrets should be stored in environment variables
- Never commit `.env` files to version control
- Use strong JWT secrets (minimum 32 characters)
- Enable CORS only for trusted origins
- Implement rate limiting in production

## 🚀 Deployment

### Manual Deployment
1. Build the application: `npm run build`
2. Set production environment variables
3. Start the services: `npm run start`

### Docker Deployment
1. Build images: `docker-compose build`
2. Start services: `docker-compose up -d`

## 📚 Features

- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Inventory Management** - Product tracking, stock management, warehouse operations
- **Point of Sale (POS)** - Sales processing, receipts, cashier management
- **Finance & Accounting** - General ledger, accounts payable/receivable, financial reports
- **Human Resources** - Employee management, payroll, leave management
- **Customer Relationship Management (CRM)** - Customer and vendor management
- **Reporting & Analytics** - Comprehensive business reports and dashboards
- **Multi-branch Support** - Support for multiple business locations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and add tests
4. Run tests: `npm run test`
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support, please open an issue on the GitHub repository.