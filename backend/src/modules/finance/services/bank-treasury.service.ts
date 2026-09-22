// backend/src/modules/finance/services/bank-treasury.service.ts
import { prisma } from '@core/database/db';
import { Prisma } from "../../../generated";
import { TransactionType, BankAccountType } from "../../../generated/enums.js";
import { logger } from '@core/utils/logger';
import { getRequestContext } from '@core/async-context';

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
   * Resolve or create a branch-scoped bank/treasury account for a given
   * payment method. Each branch gets its own Cash/M-Pesa/Operating account;
   * a request with no branch in context (background jobs, HQ-level actions)
   * resolves/creates against the branchId=null head-office account instead.
   */
  static async resolveAccount(
    paymentMethod?: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx || prisma;
    const method = (paymentMethod || "").toUpperCase();
    const branchId = getRequestContext().branchId ?? null;

    // Determine account search criteria based on payment method
    let accountNamePattern = "Operating Account";
    let bankName = "Primary Commercial Bank";
    let accountNumberBase = "BANK-001";

    if (method.includes("CASH")) {
      accountNamePattern = "Cash Account";
      bankName = "Cash in Vault / Drawer";
      accountNumberBase = "CASH-001";
    } else if (method.includes("MPESA") || method.includes("MOBILE")) {
      accountNamePattern = "M-Pesa / Mobile Money";
      bankName = "Safaricom M-Pesa";
      accountNumberBase = "MPESA-001";
    }

    // Try finding the matching account for this branch (or the head-office
    // account when there's no branch in context) by name keyword.
    const keyword = accountNamePattern.split(" ")[0];
    let account = await client.bankAccount.findFirst({
      where: {
        is_active: true,
        branchId,
        account_name: { contains: keyword, mode: "insensitive" },
      },
    });

    // Fallback: create the account for this branch if none exists yet.
    // account_number is qualified per-branch (unique on [account_number,
    // branchId]) so each branch's auto-provisioned account gets its own row
    // instead of colliding with another branch's CASH-001/MPESA-001/BANK-001.
    if (!account) {
      const suffix = branchId ?? "HQ";
      account = await client.bankAccount.create({
        data: {
          account_name: accountNamePattern,
          account_number: `${accountNumberBase}-${suffix}`,
          bank_name: bankName,
          branchId,
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
    input: RecordTreasuryTransactionInput,
  ) {
    try {
      const {
        paymentMethod,
        type,
        amount,
        description,
        referenceNo,
        category,
      } = input;
      if (!amount || amount <= 0) return null;

      const account = await this.resolveAccount(paymentMethod, tx);
      const branchId = getRequestContext().branchId ?? account.branchId ?? null;
      // TransactionType.income === "income" at runtime, so one check covers both
      // the plain-string and enum forms of the input.
      const isIncome = type === TransactionType.income;
      const transactionType: TransactionType = isIncome
        ? TransactionType.income
        : TransactionType.expense;

      const delta = isIncome ? amount : -amount;
      const newBalance = (account.current_balance || 0) + delta;

      const txnNo = `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const transaction = await tx.bankTransaction.create({
        data: {
          transaction_no: txnNo,
          bank_account_id: account.id,
          branchId,
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
