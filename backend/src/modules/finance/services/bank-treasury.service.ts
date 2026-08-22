// backend/src/modules/finance/services/bank-treasury.service.ts
import { prisma } from "../../../lib/db";
import { Prisma, TransactionType, BankAccountType } from "../../../generated";
import { logger } from "../../../lib/logger";

export interface RecordTreasuryTransactionInput {
  paymentMethod?: string;
  type: "income" | "expense" | TransactionType;
  amount: number;
  description: string;
  referenceNo?: string;
  category?: string;
}

export class BankTreasuryService {
  /**
   * Resolve or create a default bank/treasury account for a given payment method
   */
  static async resolveAccount(
    paymentMethod?: string,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;
    const method = (paymentMethod || "").toUpperCase();

    // Determine account search criteria based on payment method
    let accountNamePattern = "Operating Account";
    let bankName = "Primary Commercial Bank";
    let accountNumber = "BANK-001";

    if (method.includes("CASH")) {
      accountNamePattern = "Cash Account";
      bankName = "Cash in Vault / Drawer";
      accountNumber = "CASH-001";
    } else if (method.includes("MPESA") || method.includes("MOBILE")) {
      accountNamePattern = "M-Pesa / Mobile Money";
      bankName = "Safaricom M-Pesa";
      accountNumber = "MPESA-001";
    }

    // Try finding matching account by name keyword
    const keyword = accountNamePattern.split(" ")[0];
    let account = await client.bankAccount.findFirst({
      where: {
        is_active: true,
        account_name: { contains: keyword, mode: "insensitive" },
      },
    });

    // Fallback: any active bank account
    if (!account) {
      account = await client.bankAccount.findFirst({
        where: { is_active: true },
        orderBy: { createdAt: "asc" },
      });
    }

    // Fallback: create default account if none exists in DB
    if (!account) {
      account = await client.bankAccount.create({
        data: {
          account_name: accountNamePattern,
          account_number: accountNumber,
          bank_name: bankName,
          account_type: BankAccountType.checking,
          currency: "KES",
          current_balance: 0,
          available_balance: 0,
          is_active: true,
        },
      });
    }

    return account;
  }

  /**
   * Record cash/bank movement in treasury model
   */
  static async recordTransaction(
    tx: Prisma.TransactionClient,
    input: RecordTreasuryTransactionInput
  ) {
    try {
      const { paymentMethod, type, amount, description, referenceNo, category } = input;
      if (!amount || amount <= 0) return null;

      const account = await this.resolveAccount(paymentMethod, tx);
      const isIncome = type === "income" || type === TransactionType.income;
      const transactionType: TransactionType = isIncome ? TransactionType.income : TransactionType.expense;

      const delta = isIncome ? amount : -amount;
      const newBalance = (account.current_balance || 0) + delta;

      const txnNo = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const transaction = await tx.bankTransaction.create({
        data: {
          transaction_no: txnNo,
          bank_account_id: account.id,
          transaction_type: transactionType,
          amount,
          balance_after: newBalance,
          description,
          reference_no: referenceNo || null,
          category: category || "treasury",
          is_reconciled: false,
          transaction_date: new Date(),
        },
      });

      await tx.bankAccount.update({
        where: { id: account.id },
        data: {
          current_balance: { increment: delta },
          available_balance: { increment: delta },
        },
      });

      return transaction;
    } catch (error) {
      logger.error(error as Error, "Failed to record BankTreasury transaction");
      // Treasury recording should not throw to prevent blocking the main business transaction
      return null;
    }
  }
}
