"use strict";
/**
 * Verify Performance Optimization
 * Run this script to check if indexes were created and test query performance
 */
Object.defineProperty(exports, "__esModule", { value: true });
const db_js_1 = require("../src/lib/db.js");
async function verifyIndexes() {
    console.log('🔍 Checking if performance indexes exist...\n');
    const indexes = await db_js_1.prisma.$queryRaw `
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename IN ('products', 'deliveries', 'branches', 'warehouses', 'users', 'finance_transactions', 'payroll')
    AND indexname LIKE '%_idx'
    ORDER BY tablename, indexname
  `;
    const expectedIndexes = [
        'products_active_low_stock_idx',
        'deliveries_status_idx',
        'deliveries_status_created_idx',
        'products_category_active_idx',
        'finance_transactions_type_date_idx',
        'payroll_status_user_idx',
    ];
    let allFound = true;
    expectedIndexes.forEach(expected => {
        const found = indexes.some(idx => idx.indexname === expected);
        const status = found ? '✅' : '❌';
        console.log(`${status} ${expected}`);
        if (!found)
            allFound = false;
    });
    console.log('\n');
    if (allFound) {
        console.log('✅ All performance indexes are in place!\n');
    }
    else {
        console.log('❌ Some indexes are missing. Run: npx prisma migrate deploy\n');
        process.exit(1);
    }
}
async function testQueryPerformance() {
    console.log('⚡ Testing query performance...\n');
    const tests = [
        {
            name: 'Low Stock Items',
            query: async () => {
                const start = Date.now();
                const result = await db_js_1.prisma.$queryRaw `
          SELECT COUNT(*) as count 
          FROM "products" 
          WHERE "isActive" = true 
            AND "quantity" <= "reorder_level"
        `;
                return Date.now() - start;
            }
        },
        {
            name: 'Active Branches',
            query: async () => {
                const start = Date.now();
                const result = await db_js_1.prisma.$queryRaw `
          SELECT COUNT(*) as count 
          FROM "branches" 
          WHERE "isActive" = true
        `;
                return Date.now() - start;
            }
        },
        {
            name: 'Active Users',
            query: async () => {
                const start = Date.now();
                const result = await db_js_1.prisma.$queryRaw `
          SELECT COUNT(*) as count 
          FROM "users" 
          WHERE "isActive" = true
        `;
                return Date.now() - start;
            }
        },
        {
            name: 'Pending Deliveries',
            query: async () => {
                const start = Date.now();
                const result = await db_js_1.prisma.$queryRaw `
          SELECT COUNT(*) as count 
          FROM "deliveries" 
          WHERE "status" IN ('pending', 'assigned', 'in_transit')
        `;
                return Date.now() - start;
            }
        }
    ];
    const results = [];
    for (const test of tests) {
        const duration = await test.query();
        results.push({ name: test.name, duration });
    }
    console.log('Query Performance Results:');
    console.log('─'.repeat(50));
    let totalDuration = 0;
    results.forEach(result => {
        const status = result.duration < 200 ? '✅' : result.duration < 500 ? '⚠️' : '❌';
        console.log(`${status} ${result.name.padEnd(25)} ${result.duration}ms`);
        totalDuration += result.duration;
    });
    console.log('─'.repeat(50));
    console.log(`   Total Time:                  ${totalDuration}ms\n`);
    if (totalDuration < 500) {
        console.log('✅ Excellent! All queries are fast (< 500ms total)');
    }
    else if (totalDuration < 1000) {
        console.log('⚠️  Good, but could be better. Expected < 500ms total');
    }
    else {
        console.log('❌ Queries are still slow. Check if indexes were applied correctly.');
    }
    console.log('\n📊 Benchmark:');
    console.log('   Before optimization: ~2,700ms');
    console.log('   After optimization:  ~50-200ms');
    console.log(`   Your result:         ${totalDuration}ms`);
    if (totalDuration < 500) {
        const improvement = Math.round((2700 / totalDuration) * 10) / 10;
        console.log(`   🎉 ${improvement}x faster!\n`);
    }
}
async function main() {
    try {
        console.log('🚀 Performance Optimization Verification\n');
        console.log('='.repeat(50));
        console.log('\n');
        await verifyIndexes();
        await testQueryPerformance();
        console.log('\n✨ Verification complete!\n');
    }
    catch (error) {
        console.error('❌ Error during verification:', error);
        process.exit(1);
    }
    finally {
        await db_js_1.prisma.$disconnect();
    }
}
main();
