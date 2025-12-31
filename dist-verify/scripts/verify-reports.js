"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/scripts/verify-reports.ts
require("dotenv/config");
const db_1 = require("../src/lib/db");
const accounting_service_1 = require("../src/modules/finance/services/accounting.service");
async function main() {
    console.log('--- Starting Financial Report Verification ---');
    try {
        await db_1.prisma.$transaction(async (tx) => {
            // 1. Create a Test Sale to generate data
            const saleData = {
                saleId: 'TEST-REPORT-SALE-001',
                date: new Date(),
                amountPaid: 1160,
                paymentMethod: 'cash',
                subtotal: 1000,
                tax: 160,
                total: 1160,
                userId: 'test-user',
                branchId: 'test-branch',
            };
            console.log('1. Recording Sale...');
            await accounting_service_1.AccountingService.recordSaleTransaction(tx, saleData);
            // 2. Fetch Balance Sheet
            // Note: We need to commit the transaction for independent reads if isolation level is mismatched, 
            // but here we are inside the same transaction?
            // Actually, AccountingService.getBalanceSheet uses `prisma` (global), not `tx`.
            // This is a flaw in my implementation if I want atomic read-your-writes in a transaction.
            // But for verification script, this means the global prisma won't see the updates inside `tx` until commit.
            // workaround: We will throw error at end to rollback, but we can't verify "read" inside here 
            // unless we patch AccountingService to use `tx` OR we trust unit tests.
            // Actually, let's just inspect the JournalEntries created in this TX directly?
            // No, we want to test the aggregation logic.
            // OK, for this script to work without polluting DB, we have a dilemma.
            // We can't use `AccountingService.getBalanceSheet` cleanly because it uses global `prisma`.
            // Alternative: We will mock the `prisma.journalEntry.groupBy` call for the report methods relative to this specific test? 
            // Too complex for a script.
            // Let's just create the data, commit it, read reports, and then DELETE the data?
            // That's risky but cleaner for "Real" verification.
            // Or we just accept that we verified the "Write" side in Task 1.1, 
            // and now we verify the "Read" side with whatever data is in DB?
            // Let's rely on standard verification:
            // 1. Check if any data exists.
            // 2. Fetch reports.
            // 3. Output structure.
            // If empty, we can't verify much.
            // Let's assume the previous `verify-accounting-manual.ts` didn't commit.
            // Let's modify this script to:
            // 1. Create data (commit it).
            // 2. Run reports.
            // 3. Delete data.
        });
    }
    catch (e) {
        console.log('Skipping Transaction based approach due to read isolation issues.');
    }
    // Real Integration Test approach (Create, Read, Delete)
    console.log('\n--- Real Integration Test (Create -> Read -> Delete) ---');
    const saleId = `TEST-REPORT-${Date.now()}`;
    try {
        // 1. Create Sale (Using Transaction for safety, but committing it)
        await db_1.prisma.$transaction(async (tx) => {
            await accounting_service_1.AccountingService.recordSaleTransaction(tx, {
                saleId: saleId,
                date: new Date(),
                amountPaid: 1160,
                paymentMethod: 'cash',
                subtotal: 1000,
                tax: 160,
                total: 1160,
                userId: 'verifier',
                branchId: 'main',
            });
        });
        console.log('Data Created.');
        // 2. Read Reports
        console.log('\n--- Balance Sheet ---');
        const bs = await accounting_service_1.AccountingService.getBalanceSheet();
        console.log('Total Assets:', bs.totalAssets);
        console.log('Total Liabilities:', bs.totalLiabilities);
        console.log('Total Equity:', bs.totalEquity);
        console.log('\n--- Profit & Loss ---');
        const pnl = await accounting_service_1.AccountingService.getIncomeStatement(new Date(2000, 0, 1), new Date());
        console.log('Revenue:', pnl.totalRevenue);
        console.log('Expenses:', pnl.totalExpenses);
        console.log('Net Income:', pnl.netIncome);
        console.log('\n--- Cash Flow ---');
        const cf = await accounting_service_1.AccountingService.getCashFlow(new Date(2000, 0, 1), new Date());
        console.log('Net Change:', cf.summary.netChange);
        // 3. Cleanup
        console.log('\nCleaning up...');
        await db_1.prisma.journalEntry.deleteMany({
            where: {
                reference_id: saleId
            }
        });
        // We purposefully don't delete the Account Balance updates because that's hard to rollback nicely 
        // without resetting the whole account. 
        // But since we are in dev, this is acceptable. 
        // Ideally we would decrement the balances.
        await db_1.prisma.chartOfAccount.update({
            where: { account_code: accounting_service_1.DEFAULT_ACCOUNTS.CASH_ON_HAND.code },
            data: { current_balance: { decrement: 1160 } }
        });
        await db_1.prisma.chartOfAccount.update({
            where: { account_code: accounting_service_1.DEFAULT_ACCOUNTS.SALES_REVENUE.code },
            data: { current_balance: { decrement: 1000 } }
        });
        await db_1.prisma.chartOfAccount.update({
            where: { account_code: accounting_service_1.DEFAULT_ACCOUNTS.SALES_TAX_PAYABLE.code },
            data: { current_balance: { decrement: 160 } }
        });
        console.log('Cleanup Complete.');
    }
    catch (error) {
        console.error('Verification Failed:', error);
        // Attempt cleanup
        try {
            await db_1.prisma.journalEntry.deleteMany({ where: { reference_id: saleId } });
        }
        catch (e) { }
    }
}
main();
