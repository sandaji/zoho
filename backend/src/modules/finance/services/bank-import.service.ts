import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { BankService } from "./bank.service";

/**
 * Bank statement import v2 (Phase 11d): tolerant CSV parsing (quoted fields,
 * single Amount column OR separate Debit/Credit, several date formats),
 * preview-before-commit, duplicate protection, and auto-matching of statement
 * lines to system-recorded transactions. No bank credentials needed - works
 * with the CSV export every Kenyan bank/M-Pesa statement provides.
 */

export interface ParsedLine {
  row: number;
  date: string; // YYYY-MM-DD
  description: string;
  reference: string;
  signedAmount: number; // + money in, - money out
  duplicate?: boolean;
}

const MAX_ROWS = 5000;

function splitCsvLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseNumber(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  let s = raw.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) {
    neg = true;
    s = s.slice(1, -1);
  }
  if (/cr$/i.test(s)) s = s.replace(/cr$/i, "");
  if (/dr$/i.test(s)) {
    neg = true;
    s = s.replace(/dr$/i, "");
  }
  s = s.replace(/[^\d.\-]/g, "");
  if (!s || s === "-" || s === ".") return null;
  let n = parseFloat(s);
  if (isNaN(n)) return null;
  if (neg) n = -Math.abs(n);
  return n;
}

function parseDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const s = raw.trim().replace(/^"|"$/g, "");
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  let y: number, mo: number, d: number;
  if (m) {
    y = +m[1]!;
    mo = +m[2]!;
    d = +m[3]!;
  } else {
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (m) {
      // Day-first (Kenya). If the "month" can't be a month, swap.
      d = +m[1]!;
      mo = +m[2]!;
      y = +m[3]!;
      if (y < 100) y += 2000;
      if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    } else {
      const t = new Date(s);
      if (isNaN(t.getTime())) return null;
      return t.toISOString().slice(0, 10);
    }
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const normDesc = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const dupKey = (date: string, signed: number, desc: string) =>
  `${date}|${signed.toFixed(2)}|${normDesc(desc)}`;

export class BankImportService {
  private bank = new BankService();

  /** Parse CSV text into normalised lines. Throws a clear error if columns can't be found. */
  parse(csv: string): { lines: ParsedLine[]; skipped: { row: number; reason: string }[] } {
    const text = csv.replace(/^﻿/, "");
    const rows = text.split(/\r?\n/).filter((l) => l.trim() !== "");
    if (rows.length < 2) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "CSV needs a header row and at least one data row");
    }
    if (rows.length > MAX_ROWS + 1) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, `Too many rows (max ${MAX_ROWS} per import)`);
    }
    const head = rows[0]!;
    const delim = [",", ";", "\t"]
      .map((d) => ({ d, n: head.split(d).length }))
      .sort((a, b) => b.n - a.n)[0]!.d;
    const header = splitCsvLine(head, delim).map((h) => h.toLowerCase());

    const find = (...keys: string[]) =>
      header.findIndex((h) => keys.some((k) => h.includes(k)));
    const dateIdx = find("date");
    const descIdx = find("desc", "particular", "narrat", "details", "remark");
    const refIdx = find("ref", "receipt", "transaction id", "trans id");
    const amtIdx = header.findIndex((h) => h === "amount" || h.includes("amount"));
    const debitIdx = find("debit", "withdraw", "paid out", "money out");
    const creditIdx = find("credit", "deposit", "paid in", "money in");

    if (dateIdx === -1 || (descIdx === -1 && refIdx === -1)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Could not find columns. Need a Date column, a Description column, and either Amount or Debit/Credit.",
      );
    }
    const useSplit = amtIdx === -1 || (debitIdx !== -1 && creditIdx !== -1 && amtIdx === debitIdx);
    if (useSplit && (debitIdx === -1 || creditIdx === -1)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Need an Amount column, or both Debit and Credit columns.",
      );
    }

    const lines: ParsedLine[] = [];
    const skipped: { row: number; reason: string }[] = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = splitCsvLine(rows[i]!, delim);
      const date = parseDate(cols[dateIdx]);
      if (!date) {
        skipped.push({ row: i + 1, reason: "Unreadable date" });
        continue;
      }
      let signed: number | null = null;
      if (useSplit) {
        const dr = parseNumber(cols[debitIdx]);
        const cr = parseNumber(cols[creditIdx]);
        if (cr && cr !== 0) signed = Math.abs(cr);
        else if (dr && dr !== 0) signed = -Math.abs(dr);
      } else {
        signed = parseNumber(cols[amtIdx]);
      }
      if (signed === null || signed === 0) {
        skipped.push({ row: i + 1, reason: "No amount" });
        continue;
      }
      const description = (cols[descIdx] ?? "").replace(/["']/g, "").trim() || (cols[refIdx] ?? "") || "Bank item";
      lines.push({
        row: i + 1,
        date,
        description: description.slice(0, 300),
        reference: (refIdx !== -1 ? cols[refIdx] ?? "" : "").slice(0, 100),
        signedAmount: Math.round(signed * 100) / 100,
      });
    }
    return { lines, skipped };
  }

  /** Flag lines that were already imported on this account. */
  private async markDuplicates(bankAccountId: string, lines: ParsedLine[]) {
    if (lines.length === 0) return;
    const dates = lines.map((l) => l.date).sort();
    const from = new Date(dates[0]! + "T00:00:00.000Z");
    const to = new Date(dates[dates.length - 1]! + "T23:59:59.999Z");
    const existing = await prisma.bankTransaction.findMany({
      where: {
        bank_account_id: bankAccountId,
        category: "statement_import",
        transaction_date: { gte: from, lte: to },
      },
      select: { transaction_date: true, amount: true, transaction_type: true, description: true },
    });
    const seen = new Map<string, number>();
    for (const e of existing) {
      const signed = e.transaction_type === "expense" ? -e.amount : e.amount;
      const k = dupKey(e.transaction_date.toISOString().slice(0, 10), signed, e.description ?? "");
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
    // Identical rows inside one file are legitimate (two same-day same-amount
    // payments); only flag as many as already exist in the database.
    for (const l of lines) {
      const k = dupKey(l.date, l.signedAmount, l.description);
      const n = seen.get(k) ?? 0;
      if (n > 0) {
        l.duplicate = true;
        seen.set(k, n - 1);
      }
    }
  }

  private async requireAccount(bankAccountId: string) {
    const acc = await prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!acc) throw new AppError(ErrorCode.NOT_FOUND, 404, "Bank account not found");
    return acc;
  }

  async preview(bankAccountId: string, csv: string) {
    await this.requireAccount(bankAccountId);
    const { lines, skipped } = this.parse(csv);
    await this.markDuplicates(bankAccountId, lines);
    const fresh = lines.filter((l) => !l.duplicate);
    return {
      total: lines.length,
      newCount: fresh.length,
      duplicateCount: lines.length - fresh.length,
      skipped,
      moneyIn: fresh.filter((l) => l.signedAmount > 0).reduce((s, l) => s + l.signedAmount, 0),
      moneyOut: fresh.filter((l) => l.signedAmount < 0).reduce((s, l) => s - l.signedAmount, 0),
      sample: lines.slice(0, 50),
    };
  }

  async commit(bankAccountId: string, csv: string, filename: string, autoMatch: boolean) {
    await this.requireAccount(bankAccountId);
    const { lines, skipped } = this.parse(csv);
    await this.markDuplicates(bankAccountId, lines);
    const fresh = lines.filter((l) => !l.duplicate);
    const batch = Date.now().toString(36);
    const base = filename.replace(/\.[^/.]+$/, "").slice(0, 40) || "statement";

    await prisma.$transaction(
      async (tx) => {
        let n = 0;
        for (const l of fresh) {
          n++;
          await tx.bankTransaction.create({
            data: {
              transaction_no: `STMT-${base}-${batch}-${n}`,
              bank_account_id: bankAccountId,
              transaction_type: l.signedAmount < 0 ? "expense" : "income",
              amount: Math.abs(l.signedAmount),
              balance_after: 0,
              description: l.description,
              reference_no: l.reference || filename,
              category: "statement_import",
              transaction_date: new Date(l.date + "T12:00:00.000Z"),
              is_reconciled: false,
            },
          });
        }
      },
      { timeout: 60000 },
    );

    const matched = autoMatch ? await this.autoMatch(bankAccountId, true) : null;
    return {
      imported: fresh.length,
      duplicates: lines.length - fresh.length,
      skipped,
      autoMatched: matched?.applied ?? 0,
    };
  }

  /**
   * Pair unreconciled statement lines with unreconciled system transactions:
   * same direction, same amount (to the cent), dates within `windowDays`.
   * One-to-one; the closest date wins and a shared reference breaks ties.
   * apply=false returns suggestions only.
   */
  async autoMatch(bankAccountId: string, apply: boolean, windowDays = 5) {
    await this.requireAccount(bankAccountId);
    const { bankLines, ledgerEntries } = await this.bank.getReconciliationData(bankAccountId);
    const signed = (t: { transaction_type: string; amount: number }) =>
      t.transaction_type === "expense" ? -t.amount : t.amount;
    const used = new Set<string>();
    const pairs: {
      bankTransactionId: string;
      systemTransactionId: string;
      amount: number;
      bankDate: Date;
      systemDate: Date;
      bankDescription: string | null;
      systemDescription: string | null;
      dayGap: number;
    }[] = [];

    for (const b of bankLines) {
      const bs = signed(b);
      let best: (typeof ledgerEntries)[number] | null = null;
      let bestScore = Infinity;
      for (const s of ledgerEntries) {
        if (used.has(s.id)) continue;
        if (Math.abs(signed(s) - bs) > 0.005) continue;
        const gap = Math.abs(b.transaction_date.getTime() - s.transaction_date.getTime()) / 86400000;
        if (gap > windowDays) continue;
        const refHit =
          b.reference_no && s.reference_no && normDesc(b.reference_no) === normDesc(s.reference_no) ? 2 : 0;
        const score = gap - refHit;
        if (score < bestScore) {
          bestScore = score;
          best = s;
        }
      }
      if (best) {
        used.add(best.id);
        pairs.push({
          bankTransactionId: b.id,
          systemTransactionId: best.id,
          amount: bs,
          bankDate: b.transaction_date,
          systemDate: best.transaction_date,
          bankDescription: b.description,
          systemDescription: best.description,
          dayGap: Math.round(Math.abs(b.transaction_date.getTime() - best.transaction_date.getTime()) / 86400000),
        });
      }
    }

    let applied = 0;
    if (apply) {
      for (const p of pairs) {
        try {
          await this.bank.reconcileItems(p.bankTransactionId, p.systemTransactionId);
          applied++;
        } catch {
          // skip pairs that fail (e.g. concurrently reconciled)
        }
      }
    }
    return {
      suggestions: pairs,
      applied,
      unmatchedStatement: bankLines.length - pairs.length,
      unmatchedSystem: ledgerEntries.length - pairs.length,
    };
  }
}

export const bankImportService = new BankImportService();
