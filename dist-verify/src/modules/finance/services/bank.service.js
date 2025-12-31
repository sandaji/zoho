"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BankService = void 0;
const db_1 = require("../../../lib/db");
class BankService {
    /**
     * Import Bank Statement from CSV Data
     * @param accountId - The ChartOfAccount ID (must be an Asset/Bank)
     * @param fileContent - Raw CSV string
     * @param filename - Original filename
     * @param userId - Uploaded by
     */
    async importStatement(accountId, fileContent, filename, userId) {
        // 1. Validate Account
        const account = await db_1.prisma.chartOfAccount.findUnique({
            where: { id: accountId }
        });
        if (!account)
            throw new Error("Account not found");
        // 2. Parse CSV (Simplified: Date, Description, Amount, Reference)
        // Assumption: CSV has header: Date,Description,Amount,Reference
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');
        if (!lines || lines.length === 0) {
            throw new Error("CSV file is empty");
        }
        const firstLine = lines[0];
        if (!firstLine) {
            throw new Error("CSV header is missing");
        }
        const header = firstLine.toLowerCase().split(',');
        // Map columns
        const dateIdx = header.findIndex(h => h.includes('date'));
        const descIdx = header.findIndex(h => h.includes('desc') || h.includes('particulars'));
        const amtIdx = header.findIndex(h => h.includes('amount') || h.includes('credit') || h.includes('debit'));
        // Note: handling separate debit/credit columns is common, simplified here for single amount column (+/-)
        if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) {
            throw new Error("Invalid CSV Format. Required: Date, Description, Amount");
        }
        // const transactions = [];
        // Start transaction to save Statement + Lines
        return await db_1.prisma.$transaction(async (tx) => {
            // Create Statement Record
            const statement = await tx.bankStatement.create({
                data: {
                    account_id: accountId,
                    filename: filename,
                    uploaded_by: userId,
                    upload_date: new Date(),
                    status: 'pending'
                }
            });
            // Parse and Create Lines
            for (let i = 1; i < lines.length; i++) {
                const currentLine = lines[i];
                if (!currentLine)
                    continue;
                const cols = currentLine.split(',');
                if (cols.length < 3)
                    continue;
                const dateCol = cols[dateIdx];
                const descCol = cols[descIdx];
                const amtCol = cols[amtIdx];
                if (!dateCol || !descCol || !amtCol)
                    continue;
                const dateStr = dateCol.trim();
                const desc = descCol.trim().replace(/['"]/g, '');
                const amountStr = amtCol.trim();
                const date = new Date(dateStr);
                if (isNaN(date.getTime()))
                    continue;
                const amount = parseFloat(amountStr);
                if (isNaN(amount))
                    continue;
                await tx.bankStatementLine.create({
                    data: {
                        statement_id: statement.id,
                        date: date,
                        description: desc,
                        amount: amount,
                        is_reconciled: false
                    }
                });
            }
            return statement;
        });
    }
    /**
     * Get Reconciliation Data
     * Fetch unmatched Bank Lines and unmatched Journal Entries for the account
     */
    async getReconciliationData(accountId) {
        // 1. Get Unreconciled Bank Lines
        const bankLines = await db_1.prisma.bankStatementLine.findMany({
            where: {
                statement: { account_id: accountId },
                is_reconciled: false
            },
            orderBy: { date: 'asc' }
        });
        // 2. Get Unreconciled System Ledger Entries (Journal Entries)
        const ledgerEntries = await db_1.prisma.journalEntry.findMany({
            where: {
                account_id: accountId,
                is_reconciled: false
            },
            orderBy: { entry_date: 'asc' }
        });
        return {
            bankLines,
            ledgerEntries
        };
    }
    /**
     * Reconcile Item
     * Match a Bank Line to a Journal Entry
     */
    async reconcileItems(bankLineId, journalEntryId) {
        return await db_1.prisma.$transaction(async (tx) => {
            const bankLine = await tx.bankStatementLine.findUnique({ where: { id: bankLineId } });
            const journalEntry = await tx.journalEntry.findUnique({ where: { id: journalEntryId } });
            if (!bankLine || !journalEntry)
                throw new Error("Record not found");
            // Validation: Amounts should match (or be roughly close if we allow dust)
            // Note: Bank Amount +ve = Deposit. Journal Entry Debit = Increase Asset (+ve concept).
            // JournalEntry uses Debit/Credit columns.
            // Asset Account: Debit (+), Credit (-).
            // Bank Line: Deposit (+).
            // So: Bank Amount == (JE.Debit - JE.Credit).
            const jeAmount = journalEntry.debit - journalEntry.credit;
            if (Math.abs(bankLine.amount - jeAmount) > 0.01) {
                throw new Error(`Amount Mismatch: Bank ${bankLine.amount} vs Ledger ${jeAmount}`);
            }
            // Mark both as reconciled
            await tx.bankStatementLine.update({
                where: { id: bankLineId },
                data: {
                    is_reconciled: true,
                    reconciled_date: new Date(),
                    journal_entry_id: journalEntryId
                }
            });
            await tx.journalEntry.update({
                where: { id: journalEntryId },
                data: {
                    is_reconciled: true,
                    reconciled_date: new Date()
                }
            });
            return { success: true };
        });
    }
}
exports.BankService = BankService;
