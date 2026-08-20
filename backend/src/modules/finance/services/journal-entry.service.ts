/**
 * Journal Entry Service - Proper Double-Entry Implementation
 * Uses JournalHeader + JournalLine pattern for balanced entries
 */

import { prisma } from "../../../lib/db";
import { Prisma, AccountType } from "../../../generated";
import { logger } from "../../../lib/logger";
import { AppError, ErrorCode } from "../../../lib/errors";
import { PeriodService } from "./period.service";

export interface JournalLineInput {
  accountId: string;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  description?: string;
}

export interface JournalEntryInput {
  entryDate: Date;
  periodId?: string;
  journalId?: string;
  branchId?: string;
  description: string;
  lines: JournalLineInput[];
  sourceType?: string;
  sourceId?: string;
  createdBy: string;
}

export class JournalEntryService {
  /**
   * Create a balanced journal entry
   * Validates that total debits = total credits and period is open
   */
  static async createJournalEntry(
    input: JournalEntryInput,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;

    // 1. Enforce & Validate Period
    let periodId = input.periodId;
    if (!periodId) {
      const activePeriod = await PeriodService.getActivePeriod(input.entryDate);
      periodId = activePeriod.id;
    } else {
      await PeriodService.ensurePeriodOpen(periodId);
    }

    // 2. Validate balance
    const totalDebits = input.lines.reduce(
      (sum, line) => sum.add(line.debit),
      new Prisma.Decimal(0)
    );
    const totalCredits = input.lines.reduce(
      (sum, line) => sum.add(line.credit),
      new Prisma.Decimal(0)
    );

    // Round to whole numbers to avoid floating-point precision issues
    const roundedDebits = totalDebits.toDecimalPlaces(0);
    const roundedCredits = totalCredits.toDecimalPlaces(0);

    if (!roundedDebits.equals(roundedCredits)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR as any,
        400,
        `Journal entry is not balanced. Debits: ${roundedDebits}, Credits: ${roundedCredits}`
      );
    }

    if (totalDebits.lessThanOrEqualTo(0)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR as any,
        400,
        "Journal entry amount must be greater than zero"
      );
    }

    // 3. Generate entry number
    const entryNo = await this.generateEntryNumber(client);

    // 4. Create journal header
    const header = await client.journalHeader.create({
      data: {
        entry_no: entryNo,
        entry_date: input.entryDate,
        period_id: periodId,
        journal_id: input.journalId,
        branch_id: input.branchId,
        description: input.description,
        total_debit: roundedDebits,
        total_credit: roundedCredits,
        source_type: input.sourceType,
        source_id: input.sourceId,
        created_by: input.createdBy,
      },
    });

    // 5. Create journal lines
    const linePromises = input.lines.map(async (line, index) => {
      const account = await client.chartOfAccount.findUnique({
        where: { id: line.accountId },
      });

      if (!account) {
        throw new AppError(
          ErrorCode.NOT_FOUND as any,
          404,
          `Account with ID ${line.accountId} not found`
        );
      }

      if (!account.is_active) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR as any,
          400,
          `Account ${account.account_name} is inactive`
        );
      }

      return client.journalLine.create({
        data: {
          header_id: header.id,
          account_id: line.accountId,
          line_no: index + 1,
          description: line.description || input.description,
          debit: line.debit.toDecimalPlaces(0),
          credit: line.credit.toDecimalPlaces(0),
        },
      });
    });

    const lines = await Promise.all(linePromises);

    // 6. Update account balances using natural sign conventions
    await this.updateAccountBalances(client, input.lines);

    logger.info(
      { headerId: header.id, entryNo: header.entry_no },
      "Journal entry created successfully"
    );

    return {
      header,
      lines,
    };
  }

  /**
   * Update account balances after journal entry using natural sign conventions:
   * - Asset / Expense: Debit (+), Credit (-)
   * - Liability / Equity / Revenue: Credit (+), Debit (-)
   */
  private static async updateAccountBalances(
    client: Prisma.TransactionClient,
    lines: JournalLineInput[]
  ) {
    for (const line of lines) {
      const account = await client.chartOfAccount.findUnique({
        where: { id: line.accountId },
        select: { account_type: true },
      });

      if (!account) continue;

      const isNormalDebit =
        account.account_type === AccountType.asset ||
        account.account_type === AccountType.expense;

      const netAmount = isNormalDebit
        ? line.debit.minus(line.credit)
        : line.credit.minus(line.debit);

      await client.chartOfAccount.update({
        where: { id: line.accountId },
        data: {
          current_balance: {
            increment: netAmount.toDecimalPlaces(0).toNumber(),
          },
        },
      });
    }
  }

  /**
   * Generate unique entry number
   */
  private static async generateEntryNumber(
    client: Prisma.TransactionClient
  ): Promise<string> {
    const year = new Date().getFullYear();
    const count = await client.journalHeader.count({
      where: {
        entry_date: {
          gte: new Date(year, 0, 1),
          lt: new Date(year + 1, 0, 1),
        },
      },
    });
    return `JE-${year}-${(count + 1).toString().padStart(6, "0")}`;
  }

  /**
   * Get journal entry by ID
   */
  static async getJournalEntry(id: string) {
    return await prisma.journalHeader.findUnique({
      where: { id },
      include: {
        lines: {
          include: {
            account: true,
          },
          orderBy: {
            line_no: "asc",
          },
        },
        period: true,
        journal: true,
        branch: true,
      },
    });
  }

  /**
   * Search journal entries
   */
  static async searchJournalEntries(params: {
    startDate?: Date;
    endDate?: Date;
    accountId?: string;
    branchId?: string;
    sourceType?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      startDate,
      endDate,
      accountId,
      branchId,
      sourceType,
      page = 1,
      limit = 20,
    } = params;

    const where: Prisma.JournalHeaderWhereInput = {};

    if (startDate || endDate) {
      where.entry_date = {};
      if (startDate) where.entry_date.gte = startDate;
      if (endDate) where.entry_date.lte = endDate;
    }

    if (branchId) {
      where.branch_id = branchId;
    }

    if (sourceType) {
      where.source_type = sourceType;
    }

    if (accountId) {
      where.lines = {
        some: {
          account_id: accountId,
        },
      };
    }

    const [headers, total] = await Promise.all([
      prisma.journalHeader.findMany({
        where,
        include: {
          lines: {
            include: {
              account: {
                select: {
                  account_code: true,
                  account_name: true,
                },
              },
            },
          },
          branch: {
            select: {
              code: true,
              name: true,
            },
          },
        },
        orderBy: {
          entry_date: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.journalHeader.count({ where }),
    ]);

    return {
      data: headers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reverse a journal entry (create reversing entry)
   */
  static async reverseJournalEntry(
    originalEntryId: string,
    reversalDate: Date,
    reason: string,
    createdBy: string
  ) {
    return await prisma.$transaction(async (tx) => {
      const original = await tx.journalHeader.findUnique({
        where: { id: originalEntryId },
        include: {
          lines: true,
        },
      });

      if (!original) {
        throw new Error("Original journal entry not found");
      }

      const reversalLines: JournalLineInput[] = original.lines.map(
        (line) => ({
          accountId: line.account_id,
          debit: line.credit.toDecimalPlaces(0),
          credit: line.debit.toDecimalPlaces(0),
          description: `Reversal of ${original.entry_no}: ${line.description}`,
        })
      );

      const reversalEntry = await this.createJournalEntry(
        {
          entryDate: reversalDate,
          periodId: original.period_id,
          branchId: original.branch_id || undefined,
          description: `Reversal of ${original.entry_no}: ${reason}`,
          lines: reversalLines,
          sourceType: "REVERSAL",
          sourceId: originalEntryId,
          createdBy,
        },
        tx
      );

      return reversalEntry;
    });
  }

  // ============================================
  // Consolidated Financial Reports (JournalHeader/JournalLine)
  // ============================================

  /**
   * Balance Sheet Report
   */
  static async getBalanceSheet(asOfDate: Date = new Date(), branchId?: string) {
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        account_type: { in: [AccountType.asset, AccountType.liability, AccountType.equity] },
        is_active: true,
      },
    });

    const whereHeader: Prisma.JournalHeaderWhereInput = {
      entry_date: { lte: asOfDate },
    };
    if (branchId) {
      whereHeader.branch_id = branchId;
    }

    const lines = await prisma.journalLine.groupBy({
      by: ["account_id"],
      where: {
        header: whereHeader,
        account_id: { in: accounts.map((a) => a.id) },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const accountBalances = accounts
      .map((acc) => {
        const lineSummary = lines.find((l) => l.account_id === acc.id);
        const debit = Math.round(Number(lineSummary?._sum.debit || 0));
        const credit = Math.round(Number(lineSummary?._sum.credit || 0));

        let balance = 0;
        if (acc.account_type === AccountType.asset) {
          balance = Math.round(debit - credit);
        } else {
          balance = Math.round(credit - debit);
        }

        return {
          ...acc,
          balance,
        };
      })
      .filter((acc) => acc.balance !== 0 || acc.current_balance !== 0);

    const assets = accountBalances.filter((a) => a.account_type === AccountType.asset);
    const liabilities = accountBalances.filter((a) => a.account_type === AccountType.liability);
    const equity = accountBalances.filter((a) => a.account_type === AccountType.equity);

    return {
      assets,
      liabilities,
      equity,
      totalAssets: assets.reduce((sum, a) => sum + a.balance, 0),
      totalLiabilities: liabilities.reduce((sum, a) => sum + a.balance, 0),
      totalEquity: equity.reduce((sum, a) => sum + a.balance, 0),
    };
  }

  /**
   * Income Statement (P&L) Report
   */
  static async getIncomeStatement(startDate: Date, endDate: Date, branchId?: string) {
    const accounts = await prisma.chartOfAccount.findMany({
      where: {
        account_type: { in: [AccountType.revenue, AccountType.expense] },
        is_active: true,
      },
    });

    const whereHeader: Prisma.JournalHeaderWhereInput = {
      entry_date: { gte: startDate, lte: endDate },
    };
    if (branchId) {
      whereHeader.branch_id = branchId;
    }

    const lines = await prisma.journalLine.groupBy({
      by: ["account_id"],
      where: {
        header: whereHeader,
        account_id: { in: accounts.map((a) => a.id) },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const accountMovements = accounts
      .map((acc) => {
        const lineSummary = lines.find((l) => l.account_id === acc.id);
        const debit = Math.round(Number(lineSummary?._sum.debit || 0));
        const credit = Math.round(Number(lineSummary?._sum.credit || 0));

        let amount = 0;
        if (acc.account_type === AccountType.revenue) {
          amount = Math.round(credit - debit);
        } else {
          amount = Math.round(debit - credit);
        }

        return {
          ...acc,
          amount,
        };
      })
      .filter((acc) => acc.amount !== 0);

    const revenueItems = accountMovements.filter((a) => a.account_type === AccountType.revenue);
    const expenseItems = accountMovements.filter((a) => a.account_type === AccountType.expense);
    const totalRevenue = revenueItems.reduce((sum, a) => sum + a.amount, 0);
    const totalExpenses = expenseItems.reduce((sum, a) => sum + a.amount, 0);

    return {
      revenueItems,
      expenseItems,
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses,
    };
  }

  /**
   * Cash Flow Statement
   */
  static async getCashFlow(startDate: Date, endDate: Date, branchId?: string) {
    const cashAccounts = await prisma.chartOfAccount.findMany({
      where: {
        OR: [
          { account_code: { in: ["1001", "1002", "1003"] } },
          { account_name: { contains: "Cash", mode: "insensitive" } },
          { account_name: { contains: "Bank", mode: "insensitive" } },
        ],
      },
    });

    const cashAccountIds = cashAccounts.map((a) => a.id);
    if (cashAccountIds.length === 0)
      return { summary: { cashIn: 0, cashOut: 0, netChange: 0 }, details: [] };

    const whereHeader: Prisma.JournalHeaderWhereInput = {
      entry_date: { gte: startDate, lte: endDate },
    };
    if (branchId) whereHeader.branch_id = branchId;

    const lines = await prisma.journalLine.findMany({
      where: {
        account_id: { in: cashAccountIds },
        header: whereHeader,
      },
      include: {
        header: true,
        account: true,
      },
      orderBy: {
        header: { entry_date: "desc" },
      },
    });

    let totalIn = 0;
    let totalOut = 0;

    for (const line of lines) {
      totalIn += Math.round(Number(line.debit));
      totalOut += Math.round(Number(line.credit));
    }

    return {
      summary: {
        cashIn: totalIn,
        cashOut: totalOut,
        netChange: Math.round(totalIn - totalOut),
      },
      details: lines.map((l) => ({
        id: l.id,
        date: l.header.entry_date,
        description: l.description || l.header.description,
        amount: Math.round(Number(l.debit) - Number(l.credit)),
        account: l.account.account_name,
      })),
    };
  }

  /**
   * Trial Balance Report
   * Verifies that total debits match total credits across all accounts
   */
  static async getTrialBalance(asOfDate: Date = new Date(), branchId?: string) {
    const accounts = await prisma.chartOfAccount.findMany({
      where: { is_active: true },
      orderBy: { account_code: "asc" },
    });

    const whereHeader: Prisma.JournalHeaderWhereInput = {
      entry_date: { lte: asOfDate },
    };
    if (branchId) whereHeader.branch_id = branchId;

    const lineSums = await prisma.journalLine.groupBy({
      by: ["account_id"],
      where: { header: whereHeader },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    let totalDebitSum = 0;
    let totalCreditSum = 0;

    const rows = accounts
      .map((acc) => {
        const sum = lineSums.find((l) => l.account_id === acc.id);
        const debit = Math.round(Number(sum?._sum.debit || 0));
        const credit = Math.round(Number(sum?._sum.credit || 0));

        totalDebitSum += debit;
        totalCreditSum += credit;

        return {
          id: acc.id,
          accountCode: acc.account_code,
          accountName: acc.account_name,
          accountType: acc.account_type,
          category: acc.category,
          debit,
          credit,
          netBalance: Math.round(debit - credit),
        };
      })
      .filter((row) => row.debit !== 0 || row.credit !== 0);

    const isBalanced = Math.abs(totalDebitSum - totalCreditSum) < 0.01;

    return {
      rows,
      totalDebit: Math.round(totalDebitSum),
      totalCredit: Math.round(totalCreditSum),
      isBalanced,
      difference: Math.round(totalDebitSum - totalCreditSum),
    };
  }
}
