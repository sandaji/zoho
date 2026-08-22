import { prisma } from "../../../lib/db";
import { TransactionType } from "../../../generated";

export class BankService {

  /**
   * Import Bank Statement from CSV Data as BankTransaction rows on a
   * BankAccount (treasury model). Rows are tagged category: "statement_import"
   * so getReconciliationData can tell them apart from transactions the
   * system itself already recorded on this account.
   * @param bankAccountId - The BankAccount ID
   * @param fileContent - Raw CSV string
   * @param filename - Original filename
   * @param userId - Uploaded by (currently unused, kept for audit/signature parity)
   */
  async importStatement(bankAccountId: string, fileContent: string, filename: string, userId: string) {
    // 1. Validate Account
    const account = await prisma.bankAccount.findUnique({
      where: { id: bankAccountId }
    });
    if (!account) throw new Error("Bank account not found");

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

    // Start transaction to save all imported lines as BankTransaction rows
    return await prisma.$transaction(async (tx) => {
        let imported = 0;
        // Running balance is informational only (CSV rows have no reported
        // balance column) — it does NOT update BankAccount.current_balance,
        // which stays driven by whatever process is authoritative for it.
        let runningBalance = account.current_balance;

        for (let i = 1; i < lines.length; i++) {
            const currentLine = lines[i];
            if (!currentLine) continue;
            const cols = currentLine.split(',');
            if (cols.length < 3) continue;

            const dateCol = cols[dateIdx];
            const descCol = cols[descIdx];
            const amtCol = cols[amtIdx];
            if (!dateCol || !descCol || !amtCol) continue;

            const dateStr = dateCol.trim();
            const desc = descCol.trim().replace(/['"]/g, '');
            const amountStr = amtCol.trim();

            const date = new Date(dateStr);
            if (isNaN(date.getTime())) continue;

            const rawAmount = parseFloat(amountStr);
            if (isNaN(rawAmount)) continue;

            const transactionType: TransactionType = rawAmount < 0 ? "expense" : "income";
            const amount = Math.abs(rawAmount);
            runningBalance += rawAmount;

            await tx.bankTransaction.create({
                data: {
                    transaction_no: `STMT-${filename.replace(/\.[^/.]+$/, "")}-${i}-${Date.now()}`,
                    bank_account_id: bankAccountId,
                    transaction_type: transactionType,
                    amount,
                    balance_after: runningBalance,
                    description: desc,
                    reference_no: filename,
                    category: "statement_import",
                    transaction_date: date,
                    is_reconciled: false,
                }
            });
            imported++;
        }

        return { imported, filename, bankAccountId };
    }, { timeout: 30000 });
  }

  /**
   * Get Reconciliation Data
   * Split unreconciled BankTransaction rows for this account into:
   * - bankLines: rows imported from an uploaded statement (category = "statement_import")
   * - ledgerEntries: rows the system itself recorded on this account
   *   (any other category — e.g. AR/AP payments, manual entries)
   */
  async getReconciliationData(bankAccountId: string) {
    const [bankLines, ledgerEntries] = await Promise.all([
      prisma.bankTransaction.findMany({
        where: {
          bank_account_id: bankAccountId,
          is_reconciled: false,
          category: "statement_import",
        },
        orderBy: { transaction_date: "asc" },
      }),
      prisma.bankTransaction.findMany({
        where: {
          bank_account_id: bankAccountId,
          is_reconciled: false,
          NOT: { category: "statement_import" },
        },
        orderBy: { transaction_date: "asc" },
      }),
    ]);

    return {
        bankLines,
        ledgerEntries
    };
  }

  /**
   * Reconcile Item
   * Match an imported statement transaction to a system-recorded transaction
   * on the same bank account.
   */
  async reconcileItems(bankTransactionId: string, systemTransactionId: string) {
     return await prisma.$transaction(async (tx) => {
         const bankTxn = await tx.bankTransaction.findUnique({ where: { id: bankTransactionId } });
         const systemTxn = await tx.bankTransaction.findUnique({ where: { id: systemTransactionId } });

         if (!bankTxn || !systemTxn) throw new Error("Record not found");

         // Amounts are stored unsigned with transaction_type indicating
         // direction; compare signed values so a deposit only matches a
         // deposit and an expense only matches an expense of equal size.
         const bankSigned = bankTxn.transaction_type === "expense" ? -bankTxn.amount : bankTxn.amount;
         const systemSigned = systemTxn.transaction_type === "expense" ? -systemTxn.amount : systemTxn.amount;

         if (Math.abs(bankSigned - systemSigned) > 0.01) {
             throw new Error(`Amount Mismatch: Statement ${bankSigned} vs System ${systemSigned}`);
         }

         const reconciledDate = new Date();

         await tx.bankTransaction.update({
             where: { id: bankTransactionId },
             data: { is_reconciled: true, reconciled_date: reconciledDate },
         });

         await tx.bankTransaction.update({
             where: { id: systemTransactionId },
             data: { is_reconciled: true, reconciled_date: reconciledDate },
         });

         return { success: true };
     });
  }
}

