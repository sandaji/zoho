# Frontend Environment Configuration
# Copy this file to .env.local and fill in your actual values

# Next.js Configuration
NEXT_PUBLIC_APP_NAME="Zoho ERP"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_API_VERSION="v1"

# Environment
NODE_ENV="development"

# API Configuration
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001/api"
NEXT_PUBLIC_AUTH_TOKEN_KEY="zoho-erp-auth-token"
NEXT_PUBLIC_REFRESH_TOKEN_KEY="zoho-erp-refresh-token"

# Features
NEXT_PUBLIC_ENABLE_ANALYTICS="false"
NEXT_PUBLIC_ENABLE_ERROR_TRACKING="false"
NEXT_PUBLIC_ENABLE_SERVICE_WORKER="false"

# External Services
NEXT_PUBLIC_GOOGLE_CLIENT_ID=""
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=""
NEXT_PUBLIC_SENTRY_DSN=""

# UI Configuration
NEXT_PUBLIC_DEFAULT_THEME="light"
NEXT_PUBLIC_DEFAULT_LOCALE="en"
NEXT_PUBLIC_DEFAULT_CURRENCY="KES"

# Development
NEXT_PUBLIC_DEBUG="true"
NEXT_PUBLIC_MOCK_API="false"

# File Upload
NEXT_PUBLIC_MAX_FILE_SIZE="10485760"
NEXT_PUBLIC_ALLOWED_FILE_TYPES=".jpg,.jpeg,.png,.pdf,.doc,.docx,.xls,.xlsx"

# Cache Configuration
NEXT_PUBLIC_CACHE_TTL="3600"
NEXT_PUBLIC_ENABLE_CACHE="true"

# ============================================================
# COMPANY DEFAULTS (shown on receipts and PDFs)
# Branch DB data takes priority — these are fallbacks
# ============================================================
NEXT_PUBLIC_COMPANY_NAME="JIMI-TECH Corporation Ltd"
NEXT_PUBLIC_COMPANY_ADDRESS="Enterprise Road 32, Nairobi, Kenya"
NEXT_PUBLIC_COMPANY_PHONE="+254 711 611 971"
NEXT_PUBLIC_COMPANY_EMAIL="info@jimi.co.ke"
NEXT_PUBLIC_COMPANY_PIN="P123456789X"

NEXT_PUBLIC_APP_VERSION="202608.1.0.0"