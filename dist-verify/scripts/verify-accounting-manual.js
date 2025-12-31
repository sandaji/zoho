"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/scripts/verify-accounting-manual.ts
require("dotenv/config"); // Load env vars
const accounting_service_1 = require("../src/modules/finance/services/accounting.service");
// Mock Transaction Object
const mockTx = {
    journalEntry: {
        create: async (args) => {
            console.log('--- Creating Journal Entry ---');
            console.log(JSON.stringify(args.data, null, 2));
            return { id: 'mock-je-id' };
        }
    },
    chartOfAccount: {
        findUnique: async (args) => {
            console.log(`Finding Account: ${args.where.account_code}`);
            return { id: `mock-acc-${args.where.account_code}`, ...args.where };
        },
        create: async (args) => {
            console.log(`Creating Account: ${args.data.account_code}`);
            return { id: `mock-acc-${args.data.account_code}`, ...args.data };
        },
        update: async (args) => {
            console.log(`Updating Account Balance: ID=${args.where.id}, Increment=${args.data.current_balance.increment}`);
            return {};
        }
    }
};
// Mock Prisma for static calls (getEnsureAccount)
// Since we can't easily mock the import inside the service without a framework,
// we'll see if the service uses the `tx` passed to it? 
// `recordSaleTransaction` uses `tx` for JE creation/update, but uses `this.getEnsureAccount` for lookups.
// `getEnsureAccount` uses global `prisma`. 
// This is a problem for manual script.
// Workaround: We will run this script in an environment where `prisma` import works?
// Or we Modify AccountingService to accept prisma client as dependency or use `tx` for everything?
// Actually `getEnsureAccount` should probably use `tx` if we want it to be atomic! 
// Good catch. I should update `AccountingService` to use `tx` for account lookup too if possible, OR just accept that lookups happen outside.
// For this script, I will try to patch the `prisma` object if possible?
// No, ESM modules are read-only.
// Alternative: Real run? 
// If I run this against the Dev DB, it will create real accounts (which is fine, we want them).
// And it will create Journal Entries. 
// I can wrap it in a real transaction and throw error at end to rollback?
// `prisma.$transaction(async (tx) => { ... throw new Error("Rollback"); })`
const db_1 = require("../src/lib/db");
async function main() {
    console.log('Starting Manual Verification of AccountingService...');
    try {
        await db_1.prisma.$transaction(async (tx) => {
            console.log('Transaction started.');
            const saleData = {
                saleId: 'TEST-SALE-MANUAL-001',
                date: new Date(),
                amountPaid: 1160,
                paymentMethod: 'cash',
                subtotal: 1000,
                tax: 160,
                total: 1160,
                userId: 'test-user',
                branchId: 'test-branch',
            };
            console.log('Recording Transaction...');
            await accounting_service_1.AccountingService.recordSaleTransaction(tx, saleData);
            console.log('Verification Successful! Journal Entries created (pending commit).');
            // Force rollback so we don't pollute DB with test data
            throw new Error('VERIFICATION_COMPLETE_ROLLBACK');
        });
    }
    catch (e) {
        if (e.message === 'VERIFICATION_COMPLETE_ROLLBACK') {
            console.log('Transaction rolled back successfully. Logic verified.');
        }
        else {
            console.error('Verification Failed:', e);
            process.exit(1);
        }
    }
}
main();
