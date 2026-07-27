// backend/src/modules/finance/services/gl.service.ts
import { prisma } from "../../../lib/db";
import { Prisma } from "../../../generated";
import { JournalEntryService, JournalLineInput } from "./journal-entry.service";

export interface JEInput {
  date: Date;
  description: string;
  journalId?: string;
  branchId?: string;
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
   * Create a Manual Journal Entry using JournalEntryService (Proper Double-Entry)
   */
  static async createManualEntry(data: JEInput) {
    const formattedLines: JournalLineInput[] = data.lines.map((line) => ({
      accountId: line.accountId,
      debit: new Prisma.Decimal(line.debit),
      credit: new Prisma.Decimal(line.credit),
      description: line.description || data.description,
    }));

    return await JournalEntryService.createJournalEntry({
      entryDate: data.date,
      journalId: data.journalId,
      branchId: data.branchId,
      description: data.description,
      lines: formattedLines,
      sourceType: "MANUAL",
      createdBy: data.userId,
    });
  }

  /**
   * Get Active Journals
   */
  static async getJournals() {
    return await prisma.journal.findMany({
      where: { isActive: true },
    });
  }

  /**
   * Search Ledger Entries (Queries JournalHeader & JournalLine)
   */
  static async getLedgerEntries(params: {
    accountId?: string;
    startDate?: Date;
    endDate?: Date;
    journalId?: string;
    branchId?: string;
    page?: number;
    limit?: number;
  }) {
    return await JournalEntryService.searchJournalEntries(params);
  }
}
