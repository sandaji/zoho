/**
 * Journal Entry Service - Proper Double-Entry Implementation
 * Uses JournalHeader + JournalLine pattern for balanced entries
 */

import { prisma } from "../../../lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "../../../generated";
import { logger } from "../../../lib/logger";
import { AppError, ErrorCode } from "../../../lib/errors";

export interface JournalLineInput {
  accountId: string;
  debit: Decimal;
  credit: Decimal;
  description?: string;
}

export interface JournalEntryInput {
  entryDate: Date;
  periodId: string;
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
   * Validates that total debits = total credits
   */
  static async createJournalEntry(
    input: JournalEntryInput,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || prisma;

    // Validate balance
    const totalDebits = input.lines.reduce(
      (sum, line) => sum.add(line.debit),
      new Decimal(0)
    );
    const totalCredits = input.lines.reduce(
      (sum, line) => sum.add(line.credit),
      new Decimal(0)
    );

    if (!totalDebits.equals(totalCredits)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR as any,
        400,
        `Journal entry is not balanced. Debits: ${totalDebits}, Credits: ${totalCredits}`
      );
    }

    if (totalDebits.lessThanOrEqualTo(0)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR as any,
        400,
        "Journal entry amount must be greater than zero"
      );
    }

    // Generate entry number
    const entryNo = await this.generateEntryNumber(client);

    // Create journal header
    const header = await client.journalHeader.create({
      data: {
        entry_no: entryNo,
        entry_date: input.entryDate,
        period_id: input.periodId,
        journal_id: input.journalId,
        branch_id: input.branchId,
        description: input.description,
        total_debit: totalDebits,
        total_credit: totalCredits,
        source_type: input.sourceType,
        source_id: input.sourceId,
        created_by: input.createdBy,
      },
    });

    // Create journal lines
    const linePromises = input.lines.map(async (line, index) => {
      // Validate account exists
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
          debit: line.debit,
          credit: line.credit,
        },
      });
    });

    const lines = await Promise.all(linePromises);

    // Update account balances
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
   * Update account balances after journal entry
   */
  private static async updateAccountBalances(
    client: Prisma.TransactionClient,
    lines: JournalLineInput[]
  ) {
    for (const line of lines) {
      const netAmount = line.debit.minus(line.credit);

      await client.chartOfAccount.update({
        where: { id: line.accountId },
        data: {
          current_balance: {
            increment: netAmount.toNumber(),
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
      // Get original entry
      const original = await tx.journalHeader.findUnique({
        where: { id: originalEntryId },
        include: {
          lines: true,
        },
      });

      if (!original) {
        throw new Error("Original journal entry not found");
      }

      // Create reversal entry (debits become credits and vice versa)
      const reversalLines: JournalLineInput[] = original.lines.map(
        (line) => ({
          accountId: line.account_id,
          debit: line.credit, // Swap debit/credit
          credit: line.debit,
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
}
