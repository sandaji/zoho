# Backend Scripts

Utility scripts for database management, testing, and performance optimization.

## Performance Optimization

### verify-performance.ts
Verifies that performance indexes are installed and tests query speed.

```bash
npm run perf:verify
```

**What it does:**
- ✅ Checks if all performance indexes exist
- ⚡ Tests actual query performance
- 📊 Compares results to benchmarks
- 🎉 Shows improvement metrics

**Expected output:**
```
✅ All performance indexes are in place!
⚡ Testing query performance...
✅ Low Stock Items              45ms
✅ Active Branches              32ms
✅ Active Users                 38ms
✅ Pending Deliveries           28ms
✅ Excellent! All queries are fast (< 500ms total)
🎉 12.5x faster!
```

### run-performance-migration.sh
Bash script to apply the performance optimization migration (Linux/Mac).

```bash
./scripts/run-performance-migration.sh
```

## Usage

### Run a Script with tsx

```bash
# From backend directory
tsx scripts/verify-performance.ts

# Or use npm script
npm run perf:verify
```

### Make Scripts Executable (Linux/Mac)

```bash
chmod +x scripts/*.sh
```

## Available NPM Scripts

Add these to package.json if not already present:

```json
{
  "scripts": {
    "perf:migrate": "prisma migrate deploy",
    "perf:verify": "tsx scripts/verify-performance.ts"
  }
}
```

## Script Development

When creating new scripts:

1. Use `.ts` extension for TypeScript scripts
2. Use `.sh` extension for Bash scripts
3. Add proper error handling
4. Include helpful console output
5. Document in this README
6. Add corresponding npm script if useful

## Troubleshooting

### Script Won't Run

**TypeScript scripts:**
```bash
# Install tsx if missing
npm install -D tsx

# Run directly
npx tsx scripts/your-script.ts
```

**Bash scripts (Windows):**
```bash
# Use Git Bash or WSL
./scripts/your-script.sh
```

### Permission Denied (Linux/Mac)

```bash
chmod +x scripts/your-script.sh
```

## Contributing

When adding new scripts:
1. Place them in the `scripts/` directory
2. Update this README
3. Add npm script if appropriate
4. Test on your platform
