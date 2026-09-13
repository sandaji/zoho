#!/usr/bin/env bash

set -e # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting Backend Directory Restructuring..."

# 1. Create Core, Shared, and Scripts Target Folders
mkdir -p src/core/database
mkdir -p src/core/errors
mkdir -p src/core/events
mkdir -p src/core/middleware
mkdir -p src/core/utils
mkdir -p src/shared
mkdir -p scripts/maintenance

# 2. Consolidate One-Off Maintenance Scripts from prisma/ into scripts/
echo "📦 Moving maintenance scripts to scripts/..."
mv prisma/assign-procurement-role.ts scripts/maintenance/ 2>/dev/null || true
mv prisma/check-user-permissions.ts scripts/maintenance/ 2>/dev/null || true
mv prisma/fix-procurement-permissions.ts scripts/maintenance/ 2>/dev/null || true
mv prisma/update-rbac.ts scripts/maintenance/ 2>/dev/null || true
mv prisma/verify-rbac.ts scripts/maintenance/ 2>/dev/null || true
mv prisma/fix_column_alignment.sql scripts/maintenance/ 2>/dev/null || true

# Move root seed file if present
mv seed-dashboard.ts scripts/ 2>/dev/null || true

# 3. Untangle src/lib/ into Core, Core Middleware, and Shared
echo "📂 Reorganizing src/lib/..."

# Core Infrastructure & Database
mv src/lib/db.ts src/core/database/ 2>/dev/null || true
mv src/lib/prisma.ts src/core/database/ 2>/dev/null || true
mv src/lib/async-context.ts src/core/ 2>/dev/null || true
mv src/lib/errors.ts src/core/errors/ 2>/dev/null || true
mv src/lib/events.ts src/core/events/ 2>/dev/null || true
mv src/lib/domain-events.ts src/core/events/ 2>/dev/null || true

# Core Utils
mv src/lib/jwt.ts src/core/utils/ 2>/dev/null || true
mv src/lib/logger.ts src/core/utils/ 2>/dev/null || true
mv src/lib/password.ts src/core/utils/ 2>/dev/null || true
mv src/lib/response.ts src/core/utils/ 2>/dev/null || true
mv src/lib/response-formatter.ts src/core/utils/ 2>/dev/null || true
mv src/lib/scoped-query.helper.ts src/core/utils/ 2>/dev/null || true

# Core Middleware
mv src/lib/auth.ts src/core/middleware/ 2>/dev/null || true
mv src/lib/audit.ts src/core/middleware/ 2>/dev/null || true
mv src/lib/rbac.service.ts src/core/middleware/ 2>/dev/null || true
mv src/lib/request-helpers.ts src/core/middleware/ 2>/dev/null || true
mv src/lib/rbac-config.ts src/config/ 2>/dev/null || true

# Shared Services
mv src/lib/pdf-generator.ts src/shared/ 2>/dev/null || true
mv src/lib/code-generator.service.ts src/shared/ 2>/dev/null || true
mv src/lib/document.service.ts src/shared/ 2>/dev/null || true
mv src/lib/sales-calculator.ts src/shared/ 2>/dev/null || true
mv src/lib/inventory-sync.ts src/shared/ 2>/dev/null || true
mv src/lib/sequencer.ts src/shared/ 2>/dev/null || true
mv src/lib/services/valuation.service.ts src/shared/ 2>/dev/null || true

# Remove leftover lib subfolders if empty
rmdir src/lib/services 2>/dev/null || true
rmdir src/lib 2>/dev/null || true

# 4. Standardize Singular Subfolders inside modules/ to Plural
echo "🧹 Standardizing module internal naming (singular to plural)..."

MODULES_DIR="src/modules"

for module in $(ls "$MODULES_DIR"); do
  MOD_PATH="$MODULES_DIR/$module"
  if [ -d "$MOD_PATH" ]; then
    # Merge controller -> controllers
    if [ -d "$MOD_PATH/controller" ]; then
      mkdir -p "$MOD_PATH/controllers"
      mv "$MOD_PATH/controller/"* "$MOD_PATH/controllers/" 2>/dev/null || true
      rmdir "$MOD_PATH/controller" 2>/dev/null || true
    fi

    # Merge service -> services
    if [ -d "$MOD_PATH/service" ]; then
      mkdir -p "$MOD_PATH/services"
      mv "$MOD_PATH/service/"* "$MOD_PATH/services/" 2>/dev/null || true
      rmdir "$MOD_PATH/service" 2>/dev/null || true
    fi

    # Merge dto -> dtos
    if [ -d "$MOD_PATH/dto" ]; then
      mkdir -p "$MOD_PATH/dtos"
      mv "$MOD_PATH/dto/"* "$MOD_PATH/dtos/" 2>/dev/null || true
      rmdir "$MOD_PATH/dto" 2>/dev/null || true
    fi
  fi
done

# 5. Clean Junk Directories
echo "🗑️ Removing legacy junk directories..."
rm -rf _archive
rm -rf _delete_me

echo "✅ Backend structure refactored successfully!"