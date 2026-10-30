import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { Prisma } from "../../../generated";
import { AccountType } from "../../../generated/enums.js";
import { AccountingService, DEFAULT_ACCOUNTS } from "./accounting.service";
import { JournalEntryService } from "./journal-entry.service";
import { GENERAL_EXPENSE_ACCOUNT } from "./payment-voucher.service";

const PETTY_CASH_ACCOUNT = {
  code: "1004",
  name: "Petty Cash",
  type: AccountType.asset,
  category: "Current Assets",
};

const bad = (msg: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, msg);
const forbid = (msg: string) => new AppError(ErrorCode.FORBIDDEN, 403, msg);

export class PettyCashService {
  private async attachUsers<T extends Record<string, any>>(rows: T[], keys: string[]) {
    const ids = new Set<string>();
    for (const r of rows) for (const k of keys) if (r[k]) ids.add(r[k]);
    const users = ids.size
      ? await prisma.user.findMany({
          where: { id: { in: [...ids] } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => {
      const extra: Record<string, unknown> = {};
      for (const k of keys) extra[k.replace(/Id$/, "")] = r[k] ? (byId.get(r[k]) ?? null) : null;
      return { ...r, ...extra };
    });
  }

  private canManage = (p: string[]) => p.includes("finance.pettycash.manage");

  async createFund(
    userId: string,
    data: {
      name: string;
      custodianEmail: string;
      imprestAmount: number;
      maxPerTransaction: number;
      branchId?: string;
    },
  ) {
    if (!data.name?.trim()) throw bad("Fund name is required.");
    if (!(data.imprestAmount > 0)) throw bad("The imprest (float) amount must be greater than zero.");
    if (!(data.maxPerTransaction > 0) || data.maxPerTransaction > data.imprestAmount)
      throw bad("The per-transaction limit must be above zero and not more than the float.");

    const custodian = await prisma.user.findFirst({
      where: { email: { equals: data.custodianEmail?.trim(), mode: "insensitive" } },
      select: { id: true, branchId: true },
    });
    if (!custodian) throw bad("No user found with that custodian email.");
    if (custodian.id === userId)
      throw forbid("You cannot make yourself the custodian of a fund you create.");

    const fund = await prisma.pettyCashFund.create({
      data: {
        name: data.name.trim(),
        custodianId: custodian.id,
        branchId: data.branchId ?? (custodian as any).branchId ?? null,
        imprestAmount: data.imprestAmount,
        maxPerTransaction: data.maxPerTransaction,
        createdById: userId,
      },
    });
    return (await this.attachUsers([fund], ["custodianId"]))[0];
  }

  async listFunds(userId: string, perms: string[]) {
    const where: Prisma.PettyCashFundWhereInput = {
      isActive: true,
      ...(!this.canManage(perms) && !perms.includes("finance.pettycash.view_all") && { custodianId: userId }),
    };
    const funds = await prisma.pettyCashFund.findMany({ where, orderBy: { createdAt: "desc" } });
    return this.attachUsers(funds, ["custodianId"]);
  }

  async getFund(id: string, userId: string, perms: string[]) {
    const fund = await prisma.pettyCashFund.findUnique({
      where: { id },
      include: { entries: { orderBy: { createdAt: "desc" }, take: 300 } },
    });
    if (!fund) throw new AppError(ErrorCode.NOT_FOUND, 404, "Petty cash fund not found");
    const privileged = this.canManage(perms) || perms.includes("finance.pettycash.view_all");
    if (!privileged && fund.custodianId !== userId)
      throw forbid("You can only view the petty cash fund you are custodian of.");

    const [withUsers] = await this.attachUsers([fund], ["custodianId"]);
    const entries = await this.attachUsers(fund.entries, ["recordedById", "voidedById"]);
    return { ...withUsers, entries };
  }

  /** Finance puts money into the fund (opening float or replenishment). */
  async topUp(
    fundId: string,
    userId: string,
    data: { amount: number; source: string; description?: string; entryDate?: string },
  ) {
    if (!(data.amount > 0)) throw bad("Amount must be greater than zero.");
    const sourceDef =
      data.source === "bank"
        ? DEFAULT_ACCOUNTS.BANK_ACCOUNT
        : data.source === "mpesa"
          ? DEFAULT_ACCOUNTS.MOBILE_MONEY
          : DEFAULT_ACCOUNTS.CASH_ON_HAND;

    const entry = await prisma.$transaction(async (tx) => {
      const fund = await tx.pettyCashFund.findUnique({ where: { id: fundId } });
      if (!fund || !fund.isActive) throw new AppError(ErrorCode.NOT_FOUND, 404, "Petty cash fund not found");
      if (fund.custodianId === userId)
        throw forbid("The custodian cannot top up their own fund — Finance must do it.");
      if (fund.balance + data.amount > fund.imprestAmount + 0.001)
        throw bad(
          `This would take the fund above its float of KES ${fund.imprestAmount.toLocaleString()} (balance KES ${fund.balance.toLocaleString()}).`,
        );

      const pettyAccount = await AccountingService.getEnsureAccount(PETTY_CASH_ACCOUNT, tx);
      const source = await AccountingService.getEnsureAccount(sourceDef, tx);
      const entryDate = data.entryDate ? new Date(data.entryDate) : new Date();
      const entryNumber = await this.nextNumber(tx);
      const description = data.description?.trim() || "Petty cash top-up";

      const je = await JournalEntryService.createJournalEntry(
        {
          entryDate,
          branchId: fund.branchId ?? undefined,
          description: `${entryNumber} — ${fund.name}: ${description}`,
          lines: [
            { accountId: pettyAccount.id, debit: new Prisma.Decimal(data.amount), credit: new Prisma.Decimal(0), description },
            { accountId: source.id, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(data.amount), description: `To ${fund.name}` },
          ],
          sourceType: "PETTY_CASH",
          sourceId: fund.id,
          createdBy: userId,
        },
        tx,
      );

      const balanceAfter = fund.balance + data.amount;
      await tx.pettyCashFund.update({ where: { id: fund.id }, data: { balance: balanceAfter } });
      return tx.pettyCashEntry.create({
        data: {
          entryNumber,
          fundId: fund.id,
          type: "TOPUP",
          amount: data.amount,
          balanceAfter,
          description,
          entryDate,
          counterAccountId: source.id,
          journalHeaderId: je.header.id,
          recordedById: userId,
        },
      });
    });
    return entry;
  }

  /** The custodian pays out of the fund. */
  async disburse(
    fundId: string,
    userId: string,
    data: {
      amount: number;
      payee: string;
      category: string;
      description: string;
      receiptRef?: string;
      expenseAccountId?: string;
      entryDate?: string;
    },
  ) {
    if (!(data.amount > 0)) throw bad("Amount must be greater than zero.");
    if (!data.payee?.trim()) throw bad("Who was paid is required.");
    if (!data.category?.trim()) throw bad("Category is required.");
    if (!data.description?.trim()) throw bad("Description is required.");

    return prisma.$transaction(async (tx) => {
      const fund = await tx.pettyCashFund.findUnique({ where: { id: fundId } });
      if (!fund || !fund.isActive) throw new AppError(ErrorCode.NOT_FOUND, 404, "Petty cash fund not found");
      if (fund.custodianId !== userId)
        throw forbid("Only the custodian of this fund can pay out of it.");
      if (data.amount > fund.maxPerTransaction)
        throw bad(
          `KES ${data.amount.toLocaleString()} is over the petty cash limit of KES ${fund.maxPerTransaction.toLocaleString()} per payment. Raise a payment voucher instead.`,
        );
      if (data.amount > fund.balance)
        throw bad(`Insufficient petty cash: balance is KES ${fund.balance.toLocaleString()}.`);

      let expense;
      if (data.expenseAccountId) {
        expense = await tx.chartOfAccount.findUnique({ where: { id: data.expenseAccountId } });
        if (!expense || expense.account_type !== AccountType.expense)
          throw bad("The chosen account is not an expense account.");
      } else {
        expense = await AccountingService.getEnsureAccount(GENERAL_EXPENSE_ACCOUNT, tx);
      }
      const pettyAccount = await AccountingService.getEnsureAccount(PETTY_CASH_ACCOUNT, tx);
      const entryDate = data.entryDate ? new Date(data.entryDate) : new Date();
      const entryNumber = await this.nextNumber(tx);

      const je = await JournalEntryService.createJournalEntry(
        {
          entryDate,
          branchId: fund.branchId ?? undefined,
          description: `${entryNumber} — ${fund.name}: ${data.payee} (${data.category})`,
          lines: [
            { accountId: expense.id, debit: new Prisma.Decimal(data.amount), credit: new Prisma.Decimal(0), description: data.description },
            { accountId: pettyAccount.id, debit: new Prisma.Decimal(0), credit: new Prisma.Decimal(data.amount), description: `Petty cash paid to ${data.payee}` },
          ],
          sourceType: "PETTY_CASH",
          sourceId: fund.id,
          createdBy: userId,
        },
        tx,
      );

      const balanceAfter = fund.balance - data.amount;
      await tx.pettyCashFund.update({ where: { id: fund.id }, data: { balance: balanceAfter } });
      return tx.pettyCashEntry.create({
        data: {
          entryNumber,
          fundId: fund.id,
          type: "DISBURSEMENT",
          amount: data.amount,
          balanceAfter,
          payee: data.payee.trim(),
          category: data.category.trim(),
          description: data.description.trim(),
          receiptRef: data.receiptRef?.trim() || null,
          entryDate,
          counterAccountId: expense.id,
          journalHeaderId: je.header.id,
          recordedById: userId,
        },
      });
    });
  }

  /** Reverse a mistaken entry. Someone other than whoever recorded it must do this. */
  async voidEntry(entryId: string, userId: string, reason: string) {
    if (!reason?.trim()) throw bad("A reason is required to void an entry.");
    return prisma.$transaction(async (tx) => {
      const entry = await tx.pettyCashEntry.findUnique({ where: { id: entryId }, include: { fund: true } });
      if (!entry) throw new AppError(ErrorCode.NOT_FOUND, 404, "Entry not found");
      if (entry.voidedAt) throw bad("This entry has already been voided.");
      if (entry.recordedById === userId)
        throw forbid("Segregation of Duties Violation: you cannot void an entry you recorded.");
      if (!entry.counterAccountId) throw bad("This entry has no ledger link and cannot be voided.");

      const isTopup = entry.type === "TOPUP";
      const newBalance = entry.fund.balance + (isTopup ? -entry.amount : entry.amount);
      if (newBalance < -0.001) throw bad("Voiding this top-up would leave the fund with a negative balance.");
      if (newBalance > entry.fund.imprestAmount + 0.001)
        throw bad("Voiding this payment would take the fund above its float.");

      const pettyAccount = await AccountingService.getEnsureAccount(PETTY_CASH_ACCOUNT, tx);
      const amt = new Prisma.Decimal(entry.amount);
      const zero = new Prisma.Decimal(0);
      await JournalEntryService.createJournalEntry(
        {
          entryDate: new Date(),
          branchId: entry.fund.branchId ?? undefined,
          description: `Void of ${entry.entryNumber}: ${reason.trim()}`,
          lines: isTopup
            ? [
                { accountId: entry.counterAccountId, debit: amt, credit: zero },
                { accountId: pettyAccount.id, debit: zero, credit: amt },
              ]
            : [
                { accountId: pettyAccount.id, debit: amt, credit: zero },
                { accountId: entry.counterAccountId, debit: zero, credit: amt },
              ],
          sourceType: "PETTY_CASH_VOID",
          sourceId: entry.id,
          createdBy: userId,
        },
        tx,
      );

      await tx.pettyCashFund.update({ where: { id: entry.fundId }, data: { balance: newBalance } });
      return tx.pettyCashEntry.update({
        where: { id: entry.id },
        data: { voidedAt: new Date(), voidedById: userId, voidReason: reason.trim() },
      });
    });
  }

  private async nextNumber(tx: Prisma.TransactionClient) {
    const count = await tx.pettyCashEntry.count();
    return `PC-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;
  }
}
