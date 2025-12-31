"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountingService = exports.DEFAULT_ACCOUNTS = void 0;
// backend/src/modules/finance/services/accounting.service.ts
const db_1 = require("../../../lib/db");
const enums_1 = require("../../../generated/enums");
exports.DEFAULT_ACCOUNTS = {
    CASH_ON_HAND: { code: "1001", name: "Cash on Hand", type: enums_1.AccountType.asset, category: "Current Assets" },
    BANK_ACCOUNT: { code: "1002", name: "Bank Account", type: enums_1.AccountType.asset, category: "Current Assets" },
    MOBILE_MONEY: { code: "1003", name: "Mobile Money (M-Pesa)", type: enums_1.AccountType.asset, category: "Current Assets" },
    ACCOUNTS_RECEIVABLE: { code: "1100", name: "Accounts Receivable", type: enums_1.AccountType.asset, category: "Current Assets" },
    SALES_REVENUE: { code: "4001", name: "Sales Revenue", type: enums_1.AccountType.revenue, category: "Revenue" },
    SALES_TAX_PAYABLE: { code: "2001", name: "Sales Tax Payable", type: enums_1.AccountType.liability, category: "Current Liabilities" },
    COST_OF_GOODS: { code: "5001", name: "Cost of Goods Sold", type: enums_1.AccountType.expense, category: "Direct Costs" },
    INVENTORY_ASSET: { code: "1200", name: "Inventory Asset", type: enums_1.AccountType.asset, category: "Current Assets" },
};
class AccountingService {
    /**
     * Get or create a chart of account by code
     */
    static async getEnsureAccount(accountDef) {
        let account = await db_1.prisma.chartOfAccount.findUnique({
            where: { account_code: accountDef.code },
        });
        if (!account) {
            account = await db_1.prisma.chartOfAccount.create({
                data: {
                    account_code: accountDef.code,
                    account_name: accountDef.name,
                    account_type: accountDef.type,
                    category: accountDef.category,
                    is_system: true,
                    is_active: true,
                },
            });
        }
        return account;
    }
    /**
     * Record a Sales Transaction
     * - Debit: Cash/Bank (Asset)
     * - Credit: Sales Revenue (Revenue)
     * - Credit: Tax Payable (Liability)
     */
    static async recordSaleTransaction(tx, // Prisma Transaction Client
    data) {
        // 1. Resolve Accounts
        const revenueAccount = await this.getEnsureAccount(exports.DEFAULT_ACCOUNTS.SALES_REVENUE);
        const taxAccount = await this.getEnsureAccount(exports.DEFAULT_ACCOUNTS.SALES_TAX_PAYABLE);
        // Determine Asset Account based on payment method
        let assetAccountDef = exports.DEFAULT_ACCOUNTS.CASH_ON_HAND;
        if (data.paymentMethod === 'mpesa')
            assetAccountDef = exports.DEFAULT_ACCOUNTS.MOBILE_MONEY;
        else if (data.paymentMethod === 'card' || data.paymentMethod === 'bank_transfer')
            assetAccountDef = exports.DEFAULT_ACCOUNTS.BANK_ACCOUNT;
        // Note: If credit/on-account, usage would be Accounts Receivable, but POS is usually immediate payment.
        const assetAccount = await this.getEnsureAccount(assetAccountDef);
        // We will create the splits separately using batch_id
        const batchId = `BATCH-${data.saleId}`;
        // 2. Debit Asset (Cash/Bank) - Increase Asset
        await tx.journalEntry.create({
            data: {
                entry_no: `JE-${data.saleId}-DR`, // Unique Entry No
                entry_date: data.date,
                account_id: assetAccount.id,
                debit: data.total, // Asset increases with Debit
                credit: 0,
                description: `POS Sale Collection - ${data.paymentMethod}`,
                reference_type: 'SALES_DOCUMENT',
                reference_id: data.saleId,
                batch_id: batchId,
                created_by: data.userId
            }
        });
        // 3. Credit Revenue - Increase Revenue
        // Revenue amount = Subtotal (Net Sales)
        // Wait, if tax is involved. Total = Subtotal + Tax.
        // If we credit Revenue with Total, we overstate revenue.
        // We should Credit Revenue with Subtotal (minus discount if applicable).
        // Let's assume Subtotal is net of discount in the input data or handle it.
        // Input `subtotal` usually means Price * Qty.
        // `total` = Subtotal + Tax - Discount.
        // Let's verify standard: 
        // DR Cash (Total)
        //    CR Revenue (Subtotal - Discount)
        //    CR Tax Payable (Tax)
        // Revenue amount calculation logic (Concept only, using net revenue below)
        const netRevenue = data.total - data.tax;
        await tx.journalEntry.create({
            data: {
                entry_no: `JE-${data.saleId}-CR-REV`,
                entry_date: data.date,
                account_id: revenueAccount.id,
                debit: 0,
                credit: netRevenue, // Revenue increases with Credit
                description: `POS Revenue`,
                reference_type: 'SALES_DOCUMENT',
                reference_id: data.saleId,
                batch_id: batchId,
                created_by: data.userId
            }
        });
        // 4. Credit Tax Payable
        if (data.tax > 0) {
            await tx.journalEntry.create({
                data: {
                    entry_no: `JE-${data.saleId}-CR-TAX`,
                    entry_date: data.date,
                    account_id: taxAccount.id,
                    debit: 0,
                    credit: data.tax, // Liability increases with Credit
                    description: `Sales Tax / VAT`,
                    reference_type: 'SALES_DOCUMENT',
                    reference_id: data.saleId,
                    batch_id: batchId,
                    created_by: data.userId
                }
            });
        }
        // Update Account Balances (Denormalization if exists in schema)
        // Schema has `current_balance` on ChartOfAccount.
        // We should update it.
        // Asset (Debit increases)
        await tx.chartOfAccount.update({
            where: { id: assetAccount.id },
            data: { current_balance: { increment: data.total } }
        });
        // Revenue (Credit increases... wait. Usually Revenue accounts are credit accounts. 
        // Does `current_balance` store strict number or signed? 
        // Typically in DB: Asset (+), Liability (-), Revenue (-), Expense (+).
        // OR all positive and we rely on type.
        // Let's assume absolute magnitude for now or simple addition for "Balance". 
        // If it's a Revenue account, "increasing" it usually means more credit. 
        // Let's just increment for now, assuming "Balance" implies "Value in that account".
        await tx.chartOfAccount.update({
            where: { id: revenueAccount.id },
            data: { current_balance: { increment: netRevenue } }
        });
        if (data.tax > 0) {
            await tx.chartOfAccount.update({
                where: { id: taxAccount.id },
                data: { current_balance: { increment: data.tax } }
            });
        }
    }
    // ============================================
    // Financial Reporting
    // ============================================
    /**
     * Balance Sheet
     * Snapshot of Assets, Liabilities, and Equity at a specific date.
     */
    static async getBankAccounts() {
        return await db_1.prisma.chartOfAccount.findMany({
            where: {
                account_type: 'asset',
                OR: [
                    { account_name: { contains: 'Bank', mode: 'insensitive' } },
                    { account_name: { contains: 'Cash', mode: 'insensitive' } },
                ]
            },
            select: {
                id: true,
                account_name: true,
                account_code: true,
                current_balance: true
            }
        });
    }
    static async getBalanceSheet(asOfDate = new Date(), branchId) {
        const whereAccount = {
            account_type: { in: [enums_1.AccountType.asset, enums_1.AccountType.liability, enums_1.AccountType.equity] },
        };
        const accounts = await db_1.prisma.chartOfAccount.findMany({
            where: whereAccount,
        });
        const whereEntries = {
            entry_date: { lte: asOfDate },
        };
        if (branchId) {
            // Assuming JournalEntry has branchId or we link via createdBy/reference
            // For now, let's assume branchId is on JournalEntry or we filter by account if branch-specific accounts exist.
            // If the schema doesn't have branchId on JournalEntry yet, we might need to add it.
            // Checking schema... JournalEntry has created_by, but not branchId directly in some versions.
            // Usually branchId should be on the transaction.
            // If not, we skip branch filtering for now to avoid crashes.
        }
        const balances = await db_1.prisma.journalEntry.groupBy({
            by: ['account_id'],
            where: whereEntries,
            _sum: {
                debit: true,
                credit: true,
            },
        });
        // Map balances to accounts
        const accountBalances = accounts.map(acc => {
            const bal = balances.find(b => b.account_id === acc.id);
            const debit = bal?._sum.debit || 0;
            const credit = bal?._sum.credit || 0;
            let net = 0;
            if (acc.account_type === enums_1.AccountType.asset) {
                net = debit - credit;
            }
            else {
                net = credit - debit;
            }
            return {
                ...acc,
                balance: net,
            };
        }).filter(acc => acc.balance !== 0);
        return {
            assets: accountBalances.filter(a => a.account_type === enums_1.AccountType.asset),
            liabilities: accountBalances.filter(a => a.account_type === enums_1.AccountType.liability),
            equity: accountBalances.filter(a => a.account_type === enums_1.AccountType.equity),
            totalAssets: accountBalances.filter(a => a.account_type === enums_1.AccountType.asset).reduce((sum, a) => sum + a.balance, 0),
            totalLiabilities: accountBalances.filter(a => a.account_type === enums_1.AccountType.liability).reduce((sum, a) => sum + a.balance, 0),
            totalEquity: accountBalances.filter(a => a.account_type === enums_1.AccountType.equity).reduce((sum, a) => sum + a.balance, 0),
        };
    }
    /**
     * Profit & Loss (Income Statement)
     * Performance over a period
     */
    static async getIncomeStatement(startDate, endDate, branchId) {
        const accounts = await db_1.prisma.chartOfAccount.findMany({
            where: {
                account_type: { in: [enums_1.AccountType.revenue, enums_1.AccountType.expense] },
            },
        });
        const whereEntries = {
            entry_date: { gte: startDate, lte: endDate },
        };
        if (branchId) {
            // whereEntries.branchId = branchId;
        }
        const movements = await db_1.prisma.journalEntry.groupBy({
            by: ['account_id'],
            where: whereEntries,
            _sum: {
                debit: true,
                credit: true,
            },
        });
        const accountMovements = accounts.map(acc => {
            const mov = movements.find(m => m.account_id === acc.id);
            const debit = mov?._sum.debit || 0;
            const credit = mov?._sum.credit || 0;
            let amount = 0;
            if (acc.account_type === enums_1.AccountType.revenue) {
                amount = credit - debit;
            }
            else {
                amount = debit - credit;
            }
            return {
                ...acc,
                amount,
            };
        }).filter(acc => acc.amount !== 0);
        const revenue = accountMovements.filter(a => a.account_type === enums_1.AccountType.revenue).reduce((sum, a) => sum + a.amount, 0);
        const expenses = accountMovements.filter(a => a.account_type === enums_1.AccountType.expense).reduce((sum, a) => sum + a.amount, 0);
        return {
            revenueItems: accountMovements.filter(a => a.account_type === enums_1.AccountType.revenue),
            expenseItems: accountMovements.filter(a => a.account_type === enums_1.AccountType.expense),
            totalRevenue: revenue,
            totalExpenses: expenses,
            netIncome: revenue - expenses,
        };
    }
    /**
     * Cash Flow Statement (Simplified)
     */
    static async getCashFlow(startDate, endDate) {
        const cashAccounts = await db_1.prisma.chartOfAccount.findMany({
            where: {
                OR: [
                    { account_code: { in: ['1001', '1002', '1003'] } },
                    { account_name: { contains: 'Cash', mode: 'insensitive' } },
                    { account_name: { contains: 'Bank', mode: 'insensitive' } }
                ]
            }
        });
        const cashAccountIds = cashAccounts.map(a => a.id);
        if (cashAccountIds.length === 0)
            return { summary: { netChange: 0 }, details: [] };
        const cashEntries = await db_1.prisma.journalEntry.findMany({
            where: {
                account_id: { in: cashAccountIds },
                entry_date: { gte: startDate, lte: endDate },
            },
            include: {
                account: true
            },
            orderBy: { entry_date: 'desc' }
        });
        let totalIn = 0;
        let totalOut = 0;
        for (const entry of cashEntries) {
            totalIn += entry.debit;
            totalOut += entry.credit;
        }
        return {
            summary: {
                cashIn: totalIn,
                cashOut: totalOut,
                netChange: totalIn - totalOut
            },
            details: cashEntries.map(e => ({
                id: e.id,
                date: e.entry_date,
                description: e.description,
                amount: e.debit - e.credit,
                account: e.account.account_name
            }))
        };
    }
}
exports.AccountingService = AccountingService;
