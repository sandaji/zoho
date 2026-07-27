// backend/src/modules/finance/services/accounting.service.ts
import { prisma } from "../../../lib/db";
import { AccountType, Prisma } from "../../../generated";
import { JournalEntryService, JournalLineInput } from "./journal-entry.service";

export const DEFAULT_ACCOUNTS = {
  CASH_ON_HAND: { code: "1001", name: "Cash on Hand", type: AccountType.asset, category: "Current Assets" },
  BANK_ACCOUNT: { code: "1002", name: "Bank Account", type: AccountType.asset, category: "Current Assets" },
  MOBILE_MONEY: { code: "1003", name: "Mobile Money (M-Pesa)", type: AccountType.asset, category: "Current Assets" },
  ACCOUNTS_RECEIVABLE: { code: "1100", name: "Accounts Receivable", type: AccountType.asset, category: "Current Assets" },
  ACCOUNTS_PAYABLE: { code: "2100", name: "Accounts Payable", type: AccountType.liability, category: "Current Liabilities" },
  SALES_REVENUE: { code: "4001", name: "Sales Revenue", type: AccountType.revenue, category: "Revenue" },
  SALES_TAX_PAYABLE: { code: "2001", name: "Sales Tax Payable", type: AccountType.liability, category: "Current Liabilities" },
  COST_OF_GOODS: { code: "5001", name: "Cost of Goods Sold", type: AccountType.expense, category: "Direct Costs" },
  INVENTORY_ASSET: { code: "1200", name: "Inventory Asset", type: AccountType.asset, category: "Current Assets" },
};

export class AccountingService {
  /**
   * Get or create a chart of account by code
   */
  static async getEnsureAccount(
    accountDef: { code: string; name: string; type: AccountType; category: string },
    tx?: any
  ) {
    const client = tx || prisma;

    let account = await client.chartOfAccount.findUnique({
      where: { account_code: accountDef.code },
    });

    if (!account) {
      account = await client.chartOfAccount.create({
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
   * Record a Sales Transaction through JournalEntryService (Proper Double-Entry)
   * - Debit: Cash/Bank/M-Pesa (Asset)
   * - Credit: Sales Revenue (Revenue)
   * - Credit: Tax Payable (Liability)
   * - Optional: Debit Cost of Goods Sold / Credit Inventory Asset
   */
  static async recordSaleTransaction(
    tx: Prisma.TransactionClient,
    data: {
      saleId: string;
      date: Date;
      amountPaid: number;
      paymentMethod: string;
      subtotal: number;
      tax: number;
      total: number;
      userId: string;
      branchId: string;
      cogs?: number;
    }
  ) {
    const revenueAccount = await this.getEnsureAccount(DEFAULT_ACCOUNTS.SALES_REVENUE, tx);
    const taxAccount = await this.getEnsureAccount(DEFAULT_ACCOUNTS.SALES_TAX_PAYABLE, tx);

    let assetAccountDef = DEFAULT_ACCOUNTS.CASH_ON_HAND;
    if (data.paymentMethod === "mpesa") assetAccountDef = DEFAULT_ACCOUNTS.MOBILE_MONEY;
    else if (data.paymentMethod === "card" || data.paymentMethod === "bank_transfer")
      assetAccountDef = DEFAULT_ACCOUNTS.BANK_ACCOUNT;

    const assetAccount = await this.getEnsureAccount(assetAccountDef, tx);

    const netRevenue = data.total - data.tax;
    const lines: JournalLineInput[] = [];

    // 1. Debit Cash/Bank for Total Received
    lines.push({
      accountId: assetAccount.id,
      debit: new Prisma.Decimal(data.total),
      credit: new Prisma.Decimal(0),
      description: `POS Collection (${data.paymentMethod})`,
    });

    // 2. Credit Revenue for Net Sales
    lines.push({
      accountId: revenueAccount.id,
      debit: new Prisma.Decimal(0),
      credit: new Prisma.Decimal(netRevenue),
      description: `POS Revenue`,
    });

    // 3. Credit Tax Payable if tax > 0
    if (data.tax > 0) {
      lines.push({
        accountId: taxAccount.id,
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(data.tax),
        description: `Sales Tax / VAT`,
      });
    }

    // 4. COGS & Inventory Asset Relief (if cost is available)
    if (data.cogs && data.cogs > 0) {
      const cogsAccount = await this.getEnsureAccount(DEFAULT_ACCOUNTS.COST_OF_GOODS, tx);
      const inventoryAccount = await this.getEnsureAccount(DEFAULT_ACCOUNTS.INVENTORY_ASSET, tx);

      lines.push({
        accountId: cogsAccount.id,
        debit: new Prisma.Decimal(data.cogs),
        credit: new Prisma.Decimal(0),
        description: `Cost of Goods Sold`,
      });
      lines.push({
        accountId: inventoryAccount.id,
        debit: new Prisma.Decimal(0),
        credit: new Prisma.Decimal(data.cogs),
        description: `Inventory Relief`,
      });
    }

    return await JournalEntryService.createJournalEntry(
      {
        entryDate: data.date,
        branchId: data.branchId,
        description: `POS Sale #${data.saleId}`,
        lines,
        sourceType: "SALES_DOCUMENT",
        sourceId: data.saleId,
        createdBy: data.userId,
      },
      tx
    );
  }

  // ============================================
  // Financial Reporting (Delegates to JournalEntryService)
  // ============================================

  static async getBankAccounts() {
    return await prisma.chartOfAccount.findMany({
      where: {
        account_type: "asset",
        OR: [
          { account_name: { contains: "Bank", mode: "insensitive" } },
          { account_name: { contains: "Cash", mode: "insensitive" } },
          { account_code: { in: ["1001", "1002", "1003"] } },
        ],
      },
      select: {
        id: true,
        account_name: true,
        account_code: true,
        current_balance: true,
      },
    });
  }

  static async getBalanceSheet(asOfDate: Date = new Date(), branchId?: string) {
    return await JournalEntryService.getBalanceSheet(asOfDate, branchId);
  }

  static async getIncomeStatement(startDate: Date, endDate: Date, branchId?: string) {
    return await JournalEntryService.getIncomeStatement(startDate, endDate, branchId);
  }

  static async getCashFlow(startDate: Date, endDate: Date, branchId?: string) {
    return await JournalEntryService.getCashFlow(startDate, endDate, branchId);
  }

  static async getTrialBalance(asOfDate: Date = new Date(), branchId?: string) {
    return await JournalEntryService.getTrialBalance(asOfDate, branchId);
  }
}
