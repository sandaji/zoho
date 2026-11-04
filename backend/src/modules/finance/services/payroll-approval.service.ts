/**
 * Payroll approval: HR submits a month's payroll as ONE request; HR manager,
 * finance manager and the MD approve it in turn. Individual records only move
 * submitted -> approved when the last stage signs off (see workflow handlers).
 */
import { randomUUID } from "crypto";
import { prisma } from "@core/database/db";
import { validationError } from "@core/errors/errors";
import workflow from "../../workflow/workflow.service";
import "../../workflow/handlers";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export class PayrollApprovalService {
  static async submit(
    input: { month: number; year: number },
    ctx: { userId: string; branchId?: string | null; authorizedBranchIds?: string[] },
  ) {
    const { month, year } = input;
    if (!Number.isInteger(month) || month < 1 || month > 12) throw validationError("month must be between 1 and 12");
    if (!Number.isInteger(year) || year < 2000 || year > 2100) throw validationError("A valid year is required");

    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    const records = await prisma.payroll.findMany({
      where: {
        period_start: { gte: from, lt: to },
        status: { in: ["draft", "submitted"] },
        ...(ctx.authorizedBranchIds?.length ? { user: { branchId: { in: ctx.authorizedBranchIds } } } : {}),
      },
      select: { id: true, net_salary: true },
    });

    // Records already inside an open payroll approval can't be submitted twice.
    const open = await prisma.workflowInstance.findMany({
      where: { entityType: "PAYROLL_RUN", status: "PENDING" },
      select: { payload: true },
    });
    const locked = new Set<string>(open.flatMap((o) => ((o.payload as any)?.payrollIds as string[]) ?? []));
    const fresh = records.filter((r) => !locked.has(r.id));
    if (!fresh.length) {
      throw validationError(
        records.length
          ? "All of this month's payroll is already awaiting approval."
          : `No draft payroll records found for ${MONTHS[month - 1]} ${year}.`,
      );
    }

    const total = Math.round(fresh.reduce((s, r) => s + r.net_salary, 0) * 100) / 100;
    const label = `${MONTHS[month - 1]} ${year}`;
    const approval = await workflow.start({
      code: "PAYROLL_APPROVAL",
      entityId: randomUUID(),
      title: `Payroll ${label}: ${fresh.length} employee${fresh.length === 1 ? "" : "s"}`,
      summary: `Net pay KSh ${total.toLocaleString("en-KE")}`,
      amount: total,
      branchId: ctx.branchId ?? null,
      requestedById: ctx.userId,
      payload: { month, year, label, count: fresh.length, total, payrollIds: fresh.map((r) => r.id) },
    });

    await prisma.payroll.updateMany({
      where: { id: { in: fresh.map((r) => r.id) }, status: "draft" },
      data: { status: "submitted" },
    });
    return { approval, count: fresh.length, total };
  }
}
