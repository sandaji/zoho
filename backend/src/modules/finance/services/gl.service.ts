// backend/src/modules/finance/services/gl.service.ts
import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";
import { PeriodService } from "./period.service";

export interface JEInput {
  date: Date;
  description: string;
  journalId: string;
  lines: {
    accountId: string;
    debit: number;
    credit: number;
    description?: string;
  }[];
  userId: string;
}

export class GeneralLedgerService {
  /**
   * Create a Manual Journal Entry
   */
  static async createManualEntry(data: JEInput) {
    // 1. Validate Balance
    const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new AppError(ErrorCode.VALIDATION_ERROR as any, 400, "Journal entry is not balanced");
    }

    // 2. Validate Period
    const period = await PeriodService.getActivePeriod(data.date);
    if (!period) {
      throw new AppError(ErrorCode.VALIDATION_ERROR as any, 400, "No open fiscal period found for date");
    }

    if (totalDebit <= 0) {
      throw new AppError(ErrorCode.VALIDATION_ERROR as any, 400, "Journal entry amount must be greater than zero");
    }

    // 3. Generate Entry Number (Simple implementation, can be improved)
    const entryCount = await prisma.journalEntry.count();
    const entryNo = `MAN-${new Date().getFullYear()}-${(entryCount + 1).toString().padStart(6, '0')}`;
    const batchId = `BATCH-MAN-${Date.now()}`;

    // 4. Create Entries in Transaction
    return await prisma.$transaction(async (tx) => {
      const entries: any[] = [];

      for (const line of data.lines) {
        // Create the entry
        const createdEntry: any = await tx.journalEntry.create({
          data: {
            entry_no: `${entryNo}-${entries.length + 1}`,
            entry_date: data.date,
            account_id: line.accountId,
            debit: line.debit,
            credit: line.credit,
            description: line.description || data.description,
            journal_id: data.journalId,
            period_id: period.id,
            batch_id: batchId,
            created_by: data.userId
          }
        });
        entries.push(createdEntry);
      }

      // Update balances
      for (const line of data.lines) {
        await tx.chartOfAccount.update({
          where: { id: line.accountId },
          data: {
            current_balance: {
              increment: line.debit - line.credit
            }
          }
        });
      }

      return entries;
    });
  }

  /**
   * Get Journals
   */
  static async getJournals() {
    return await prisma.journal.findMany({
      where: { isActive: true }
    });
  }

  /**
   * Search Ledger Entries
   */
  static async getLedgerEntries(params: {
    accountId?: string;
    startDate?: Date;
    endDate?: Date;
    journalId?: string;
  }) {
    return await prisma.journalEntry.findMany({
      where: {
        account_id: params.accountId,
        journal_id: params.journalId,
        entry_date: {
          gte: params.startDate,
          lte: params.endDate
        }
      },
      include: {
        account: true,
        journal: true
      },
      orderBy: { entry_date: 'desc' }
    });
  }
}
