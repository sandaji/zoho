import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";

const bad = (m: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, m);
const forbid = (m: string) => new AppError(ErrorCode.FORBIDDEN, 403, m);
const notFound = (m: string) => new AppError(ErrorCode.NOT_FOUND, 404, m);
const round = (n: number) => Math.round(n * 100) / 100;

export interface PeopleCtx {
  userId: string;
  perms: string[];
  /** Set for BRANCH-scoped callers; undefined means head office / all branches */
  branchIds?: string[];
}

export const CONTRACT_TYPES = ["PERMANENT", "FIXED_TERM", "PROBATION", "CASUAL", "INTERNSHIP"] as const;
const OPEN_STATUSES = ["DRAFT", "ACTIVE"];

const toDate = (v: unknown, label: string, required = false): Date | null => {
  if (v == null || v === "") {
    if (required) throw bad(`${label} is required.`);
    return null;
  }
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) throw bad(`${label} is not a valid date.`);
  return d;
};

type Component = { name: string; kind: string; calc: string; value: number };

/** Applies a structure's rules to a base salary. */
export function computePay(baseSalary: number, components: Component[]) {
  const lines = components.map((c) => {
    const amount = round(c.calc === "PERCENT_OF_BASE" ? (baseSalary * c.value) / 100 : c.value);
    return { name: c.name, kind: c.kind, calc: c.calc, value: c.value, amount };
  });
  const allowances = round(lines.filter((l) => l.kind === "ALLOWANCE").reduce((s, l) => s + l.amount, 0));
  const deductions = round(lines.filter((l) => l.kind === "DEDUCTION").reduce((s, l) => s + l.amount, 0));
  return { baseSalary, allowances, deductions, net: round(baseSalary + allowances - deductions), lines };
}

export class PeopleService {
  // ------------------------------------------------------- salary structures

  async listStructures() {
    const [structures, components] = await Promise.all([
      prisma.salaryStructure.findMany({ orderBy: { name: "asc" } }),
      prisma.salaryComponent.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    ]);
    return structures.map((s) => ({ ...s, components: components.filter((c) => c.structureId === s.id) }));
  }

  private checkComponents(components: Component[]) {
    for (const c of components) {
      if (!c.name?.trim()) throw bad("Every pay component needs a name.");
      if (!["ALLOWANCE", "DEDUCTION"].includes(c.kind)) throw bad(`"${c.name}": kind must be ALLOWANCE or DEDUCTION.`);
      if (!["FIXED", "PERCENT_OF_BASE"].includes(c.calc)) throw bad(`"${c.name}": calc must be FIXED or PERCENT_OF_BASE.`);
      if (!(c.value >= 0)) throw bad(`"${c.name}": value cannot be negative.`);
      if (c.calc === "PERCENT_OF_BASE" && c.value > 100) throw bad(`"${c.name}": a percentage cannot exceed 100.`);
    }
  }

  async saveStructure(
    id: string | null,
    d: { code?: string; name?: string; description?: string; minSalary?: number | null; maxSalary?: number | null; isActive?: boolean; components?: Component[] },
  ) {
    if (!id && (!d.code?.trim() || !d.name?.trim())) throw bad("A structure needs a code and a name.");
    if (d.minSalary != null && d.maxSalary != null && d.maxSalary < d.minSalary) throw bad("Maximum salary cannot be below the minimum.");
    if (d.components) this.checkComponents(d.components);

    const existing = id ? await prisma.salaryStructure.findUnique({ where: { id } }) : null;
    if (id && !existing) throw notFound("Salary structure not found");
    if (!id) {
      const dup = await prisma.salaryStructure.findUnique({ where: { code: d.code!.trim().toUpperCase() } });
      if (dup) throw bad(`Code ${dup.code} is already used.`);
    }

    const structureId = await prisma.$transaction(async (tx) => {
      const data = {
        ...(d.name?.trim() && { name: d.name.trim() }),
        ...(d.description !== undefined && { description: d.description?.trim() || null }),
        ...(d.minSalary !== undefined && { minSalary: d.minSalary }),
        ...(d.maxSalary !== undefined && { maxSalary: d.maxSalary }),
        ...(d.isActive !== undefined && { isActive: d.isActive }),
      };
      const row = id
        ? await tx.salaryStructure.update({ where: { id }, data })
        : await tx.salaryStructure.create({ data: { code: d.code!.trim().toUpperCase(), name: d.name!.trim(), ...data } });
      if (d.components) {
        await tx.salaryComponent.deleteMany({ where: { structureId: row.id } });
        await tx.salaryComponent.createMany({
          data: d.components.map((c, i) => ({
            structureId: row.id,
            name: c.name.trim(),
            kind: c.kind,
            calc: c.calc,
            value: c.value,
            sortOrder: i,
          })),
        });
      }
      return row.id;
    });
    return (await this.listStructures()).find((s) => s.id === structureId);
  }

  // --------------------------------------------------------------- contracts

  private async scopedUserIds(ctx: PeopleCtx): Promise<string[] | undefined> {
    if (!ctx.branchIds) return undefined;
    const users = await prisma.user.findMany({ where: { branchId: { in: ctx.branchIds } }, select: { id: true } });
    return users.map((u) => u.id);
  }

  private async decorate<T extends { userId: string; salaryStructureId: string | null }>(rows: T[]) {
    const userIds = [...new Set(rows.map((r) => r.userId))];
    const structIds = [...new Set(rows.map((r) => r.salaryStructureId).filter(Boolean) as string[])];
    const [users, structures] = await Promise.all([
      userIds.length
        ? prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true, employeeCode: true, branch: { select: { name: true } }, department: { select: { name: true } } },
          })
        : [],
      structIds.length ? prisma.salaryStructure.findMany({ where: { id: { in: structIds } }, select: { id: true, code: true, name: true } }) : [],
    ]);
    const u = new Map(users.map((x) => [x.id, x]));
    const s = new Map(structures.map((x) => [x.id, x]));
    return rows.map((r) => ({ ...r, employee: u.get(r.userId) ?? null, structure: r.salaryStructureId ? (s.get(r.salaryStructureId) ?? null) : null }));
  }

  async listContracts(ctx: PeopleCtx, q: { status?: string; userId?: string; expiringInDays?: number; search?: string }) {
    const where: Record<string, any> = {};
    if (q.status) where.status = q.status.toUpperCase();
    if (q.userId) where.userId = q.userId;
    const scoped = await this.scopedUserIds(ctx);
    if (scoped) where.userId = q.userId ? (scoped.includes(q.userId) ? q.userId : "__none__") : { in: scoped };
    if (q.expiringInDays && q.expiringInDays > 0) {
      where.status = "ACTIVE";
      where.endDate = { not: null, lte: new Date(Date.now() + q.expiringInDays * 86_400_000) };
    }
    if (q.search?.trim()) {
      const hits = await prisma.user.findMany({
        where: { OR: [{ name: { contains: q.search.trim(), mode: "insensitive" } }, { employeeCode: { contains: q.search.trim(), mode: "insensitive" } }] },
        select: { id: true },
        take: 200,
      });
      where.AND = [{ OR: [{ userId: { in: hits.map((h) => h.id) } }, { contractNumber: { contains: q.search.trim(), mode: "insensitive" } }] }];
    }
    const rows = await prisma.employmentContract.findMany({ where, orderBy: { createdAt: "desc" }, take: 300 });
    return this.decorate(rows);
  }

  async getContract(ctx: PeopleCtx, id: string) {
    const row = await prisma.employmentContract.findUnique({ where: { id } });
    if (!row) throw notFound("Contract not found");
    const scoped = await this.scopedUserIds(ctx);
    if (scoped && !scoped.includes(row.userId)) throw forbid("This employee is outside your branch.");
    const [decorated] = await this.decorate([row]);
    const components = row.salaryStructureId
      ? await prisma.salaryComponent.findMany({ where: { structureId: row.salaryStructureId }, orderBy: { sortOrder: "asc" } })
      : [];
    return { ...decorated, pay: computePay(row.baseSalary, components) };
  }

  private async validateContract(d: Record<string, any>, current?: { type: string; startDate: Date }) {
    const type = (d.type ?? current?.type) as string;
    if (!CONTRACT_TYPES.includes(type as any)) throw bad(`Contract type must be one of ${CONTRACT_TYPES.join(", ")}.`);
    const start = d.startDate !== undefined ? toDate(d.startDate, "Start date", true)! : current!.startDate;
    const end = d.endDate !== undefined ? toDate(d.endDate, "End date") : undefined;
    const probation = d.probationEndDate !== undefined ? toDate(d.probationEndDate, "Probation end") : undefined;
    if (end !== undefined && end && end <= start) throw bad("The end date must be after the start date.");
    if (probation && probation <= start) throw bad("Probation must end after the contract starts.");
    if (type !== "PERMANENT" && d.endDate !== undefined && !end) throw bad(`${type.replace("_", "-").toLowerCase()} contracts need an end date.`);
    if (d.baseSalary !== undefined && !(Number(d.baseSalary) > 0)) throw bad("Base salary must be above zero.");
    if (d.noticeDays !== undefined && !(Number(d.noticeDays) >= 0)) throw bad("Notice period cannot be negative.");
    if (d.salaryStructureId) {
      const s = await prisma.salaryStructure.findUnique({ where: { id: d.salaryStructureId } });
      if (!s || !s.isActive) throw bad("That salary structure does not exist or is switched off.");
      const base = d.baseSalary !== undefined ? Number(d.baseSalary) : undefined;
      if (base !== undefined) {
        if (s.minSalary != null && base < s.minSalary) throw bad(`Base salary is below the ${s.name} grade minimum (${s.minSalary}).`);
        if (s.maxSalary != null && base > s.maxSalary) throw bad(`Base salary is above the ${s.name} grade maximum (${s.maxSalary}).`);
      }
    }
    return { start, end, probation };
  }

  async createContract(ctx: PeopleCtx, d: Record<string, any>) {
    if (!d.userId && d.userEmail?.trim()) {
      const u = await prisma.user.findFirst({ where: { email: { equals: String(d.userEmail).trim(), mode: "insensitive" } }, select: { id: true } });
      if (!u) throw bad("No employee with that email.");
      d.userId = u.id;
    }
    if (!d.userId) throw bad("Choose the employee.");
    if (!d.jobTitle?.trim()) throw bad("Job title is required.");
    if (d.baseSalary === undefined) throw bad("Base salary is required.");
    const user = await prisma.user.findUnique({ where: { id: d.userId }, select: { id: true, isActive: true, branchId: true } });
    if (!user || !user.isActive) throw bad("That employee does not exist or is inactive.");
    if (ctx.branchIds && !(user.branchId && ctx.branchIds.includes(user.branchId))) throw forbid("This employee is outside your branch.");
    const open = await prisma.employmentContract.findFirst({ where: { userId: d.userId, status: "DRAFT" }, select: { contractNumber: true } });
    if (open) throw bad(`There is already a draft contract (${open.contractNumber}) for this employee. Finish or discard it first.`);

    const { start, end, probation } = await this.validateContract(d);
    const year = new Date().getFullYear();
    const count = await prisma.employmentContract.count();
    const row = await prisma.employmentContract.create({
      data: {
        contractNumber: `EC-${year}-${String(count + 1).padStart(4, "0")}`,
        userId: d.userId,
        type: d.type,
        jobTitle: d.jobTitle.trim(),
        startDate: start,
        endDate: end ?? null,
        probationEndDate: probation ?? null,
        noticeDays: d.noticeDays !== undefined ? Number(d.noticeDays) : 30,
        hoursPerWeek: d.hoursPerWeek !== undefined ? Number(d.hoursPerWeek) : 40,
        baseSalary: Number(d.baseSalary),
        salaryStructureId: d.salaryStructureId || null,
        notes: d.notes?.trim() || null,
        createdById: ctx.userId,
      },
    });
    return this.getContract(ctx, row.id);
  }

  async updateContract(ctx: PeopleCtx, id: string, d: Record<string, any>) {
    const row = await prisma.employmentContract.findUnique({ where: { id } });
    if (!row) throw notFound("Contract not found");
    if (row.status !== "DRAFT")
      throw bad("Only draft contracts can be edited. To change terms, draft a new contract and activate it: the old one is superseded.");
    const scoped = await this.scopedUserIds(ctx);
    if (scoped && !scoped.includes(row.userId)) throw forbid("This employee is outside your branch.");

    const merged = { ...d, baseSalary: d.baseSalary ?? row.baseSalary, salaryStructureId: d.salaryStructureId !== undefined ? d.salaryStructureId : row.salaryStructureId };
    const { start, end, probation } = await this.validateContract(merged, { type: row.type, startDate: row.startDate });
    await prisma.employmentContract.update({
      where: { id },
      data: {
        ...(d.type && { type: d.type }),
        ...(d.jobTitle?.trim() && { jobTitle: d.jobTitle.trim() }),
        ...(d.startDate !== undefined && { startDate: start }),
        ...(end !== undefined && { endDate: end }),
        ...(probation !== undefined && { probationEndDate: probation }),
        ...(d.noticeDays !== undefined && { noticeDays: Number(d.noticeDays) }),
        ...(d.hoursPerWeek !== undefined && { hoursPerWeek: Number(d.hoursPerWeek) }),
        ...(d.baseSalary !== undefined && { baseSalary: Number(d.baseSalary) }),
        ...(d.salaryStructureId !== undefined && { salaryStructureId: d.salaryStructureId || null }),
        ...(d.notes !== undefined && { notes: d.notes?.trim() || null }),
      },
    });
    return this.getContract(ctx, id);
  }

  /** Whoever drafted a contract cannot be the one who activates it (admins are exempt). */
  async activateContract(ctx: PeopleCtx, id: string) {
    const row = await prisma.employmentContract.findUnique({ where: { id } });
    if (!row) throw notFound("Contract not found");
    if (row.status !== "DRAFT") throw bad(`This contract is already ${row.status.toLowerCase()}.`);
    const scoped = await this.scopedUserIds(ctx);
    if (scoped && !scoped.includes(row.userId)) throw forbid("This employee is outside your branch.");
    if (row.createdById === ctx.userId && !ctx.perms.includes("admin.system.manage"))
      throw forbid("Segregation of Duties: someone other than the person who drafted this contract must activate it.");
    if (row.endDate && row.endDate < new Date()) throw bad("The end date is already in the past.");

    await prisma.$transaction(async (tx) => {
      await tx.employmentContract.updateMany({
        where: { userId: row.userId, status: "ACTIVE" },
        data: { status: "SUPERSEDED" },
      });
      await tx.employmentContract.update({ where: { id }, data: { status: "ACTIVE", signedAt: new Date() } });
      await tx.notification.create({
        data: {
          userId: row.userId,
          title: "Your employment contract is active",
          message: `${row.contractNumber} · ${row.jobTitle}`,
          type: "HR",
          link: "/dashboard/my-profile",
        },
      });
    });
    return this.getContract(ctx, id);
  }

  async terminateContract(ctx: PeopleCtx, id: string, d: { reason?: string; date?: string }) {
    if (!d.reason?.trim()) throw bad("A reason is required.");
    const row = await prisma.employmentContract.findUnique({ where: { id } });
    if (!row) throw notFound("Contract not found");
    if (row.status !== "ACTIVE") throw bad("Only an active contract can be terminated.");
    const scoped = await this.scopedUserIds(ctx);
    if (scoped && !scoped.includes(row.userId)) throw forbid("This employee is outside your branch.");
    await prisma.employmentContract.update({
      where: { id },
      data: { status: "TERMINATED", terminatedAt: toDate(d.date, "Termination date") ?? new Date(), terminationReason: d.reason.trim() },
    });
    return this.getContract(ctx, id);
  }

  async discardDraft(ctx: PeopleCtx, id: string) {
    const row = await prisma.employmentContract.findUnique({ where: { id } });
    if (!row) throw notFound("Contract not found");
    if (row.status !== "DRAFT") throw bad("Only drafts can be discarded.");
    const scoped = await this.scopedUserIds(ctx);
    if (scoped && !scoped.includes(row.userId)) throw forbid("This employee is outside your branch.");
    await prisma.employmentContract.delete({ where: { id } });
    return { discarded: true };
  }

  /** Marks active contracts past their end date as EXPIRED. Cheap; called on list loads. */
  async expireOverdue() {
    const r = await prisma.employmentContract.updateMany({
      where: { status: "ACTIVE", endDate: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
    return r.count;
  }

  /** Drafts one payroll record per employee on an active contract for the month. */
  async generatePayroll(ctx: PeopleCtx, d: { month: number; year: number }) {
    const month = Number(d.month);
    const year = Number(d.year);
    if (!(month >= 1 && month <= 12) || !(year >= 2000 && year <= 2100)) throw bad("Pick a valid month and year.");
    await this.expireOverdue();
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59);

    const scoped = await this.scopedUserIds(ctx);
    const contracts = await prisma.employmentContract.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
        ...(scoped && { userId: { in: scoped } }),
      },
    });
    if (!contracts.length) throw bad("No active contracts cover that month.");

    const existing = await prisma.payroll.findMany({
      where: { userId: { in: contracts.map((c) => c.userId) }, period_start: { gte: periodStart, lte: periodEnd }, status: { not: "reversed" } },
      select: { userId: true },
    });
    const done = new Set(existing.map((e) => e.userId));
    const structIds = [...new Set(contracts.map((c) => c.salaryStructureId).filter(Boolean) as string[])];
    const comps = structIds.length ? await prisma.salaryComponent.findMany({ where: { structureId: { in: structIds } } }) : [];

    let created = 0;
    const skipped: string[] = [];
    let total = 0;
    for (const c of contracts) {
      if (done.has(c.userId)) {
        skipped.push(c.contractNumber);
        continue;
      }
      const pay = computePay(c.baseSalary, comps.filter((x) => x.structureId === c.salaryStructureId));
      await prisma.payroll.create({
        data: {
          payroll_no: `PAY-${year}${String(month).padStart(2, "0")}-${c.contractNumber}`,
          userId: c.userId,
          base_salary: pay.baseSalary,
          allowances: pay.allowances,
          deductions: pay.deductions,
          net_salary: pay.net,
          period_start: periodStart,
          period_end: periodEnd,
          notes: `Generated from contract ${c.contractNumber}`,
        },
      });
      total += pay.net;
      created++;
    }
    return { created, skippedExisting: skipped.length, totalNet: round(total) };
  }

  // ---------------------------------------------------------- self-service

  async myProfile(userId: string) {
    const year = new Date().getFullYear();
    const [user, contract, allocations, requests, benefits] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          employeeCode: true,
          branch: { select: { name: true } },
          department: { select: { name: true } },
        },
      }),
      prisma.employmentContract.findFirst({ where: { userId, status: "ACTIVE" } }),
      prisma.leaveAllocation.findMany({ where: { userId, year }, include: { leaveType: { select: { name: true } } } }),
      prisma.leaveRequest.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { leaveType: { select: { name: true } } },
      }),
      prisma.benefitEnrollment.findMany({ where: { userId, status: "ACTIVE" }, include: { benefit: { select: { name: true, type: true, provider: true } } } }),
    ]);
    if (!user) throw notFound("Profile not found");

    const pending = requests.filter((r) => r.status === "PENDING");
    let pay = null;
    if (contract) {
      const comps = contract.salaryStructureId
        ? await prisma.salaryComponent.findMany({ where: { structureId: contract.salaryStructureId }, orderBy: { sortOrder: "asc" } })
        : [];
      pay = computePay(contract.baseSalary, comps);
    }
    return {
      user,
      contract,
      pay,
      leaveBalances: allocations.map((a) => ({
        leaveTypeId: a.leaveTypeId,
        leaveType: a.leaveType.name,
        allocated: a.allocated,
        used: a.used,
        pending: pending.filter((p) => p.leaveTypeId === a.leaveTypeId).reduce((s, p) => s + p.days, 0),
        remaining: a.allocated - a.used - pending.filter((p) => p.leaveTypeId === a.leaveTypeId).reduce((s, p) => s + p.days, 0),
      })),
      leaveRequests: requests.map((r) => ({
        id: r.id,
        leaveType: r.leaveType.name,
        startDate: r.startDate,
        endDate: r.endDate,
        days: r.days,
        status: r.status,
        reason: r.reason,
      })),
      benefits: benefits.map((b) => ({ id: b.id, ...b.benefit, enrolledAt: b.enrolledAt })),
    };
  }

  async updateMyProfile(userId: string, d: { phone?: string }) {
    const phone = d.phone?.trim() ?? "";
    if (phone && !/^[+\d][\d\s-]{6,19}$/.test(phone)) throw bad("Enter a valid phone number.");
    await prisma.user.update({ where: { id: userId }, data: { phone: phone || null } });
    return this.myProfile(userId);
  }

  async myPayslips(userId: string) {
    return prisma.payroll.findMany({
      where: { userId, status: { in: ["approved", "paid"] as any } },
      orderBy: { period_end: "desc" },
      take: 36,
      select: {
        id: true,
        payroll_no: true,
        status: true,
        base_salary: true,
        allowances: true,
        deductions: true,
        net_salary: true,
        period_start: true,
        period_end: true,
        paid_date: true,
      },
    });
  }

  /** Calendar days between the dates, inclusive, not counting Sundays. */
  private leaveDays(start: Date, end: Date) {
    let n = 0;
    for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86_400_000)) if (d.getDay() !== 0) n++;
    return n;
  }

  async requestLeave(userId: string, d: { leaveTypeId?: string; startDate?: string; endDate?: string; reason?: string }) {
    if (!d.leaveTypeId) throw bad("Choose a leave type.");
    const start = toDate(d.startDate, "Start date", true)!;
    const end = toDate(d.endDate, "End date", true)!;
    if (end < start) throw bad("The end date cannot be before the start date.");
    if (start < new Date(new Date().setHours(0, 0, 0, 0))) throw bad("Leave cannot start in the past.");
    const days = this.leaveDays(start, end);
    if (days < 1) throw bad("That range has no working days.");

    const overlap = await prisma.leaveRequest.findFirst({
      where: { userId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: end }, endDate: { gte: start } },
      select: { startDate: true },
    });
    if (overlap) throw bad("You already have leave requested or approved on some of those days.");

    const year = start.getFullYear();
    const alloc = await prisma.leaveAllocation.findUnique({ where: { userId_leaveTypeId_year: { userId, leaveTypeId: d.leaveTypeId, year } } });
    if (!alloc) throw bad(`You have no allocation for that leave type in ${year}. Ask HR.`);
    const pending = await prisma.leaveRequest.aggregate({
      where: { userId, leaveTypeId: d.leaveTypeId, status: "PENDING", startDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      _sum: { days: true },
    });
    const remaining = alloc.allocated - alloc.used - (pending._sum.days ?? 0);
    if (days > remaining) throw bad(`You have ${remaining} day(s) left of that leave; this request needs ${days}.`);

    const req = await prisma.leaveRequest.create({
      data: { userId, leaveTypeId: d.leaveTypeId, startDate: start, endDate: end, days, reason: d.reason?.trim() || null },
    });
    return req;
  }

  async cancelMyLeave(userId: string, id: string) {
    const r = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!r || r.userId !== userId) throw notFound("Leave request not found");
    if (r.status !== "PENDING") throw bad("Only requests that are still pending can be withdrawn.");
    return prisma.leaveRequest.update({ where: { id }, data: { status: "CANCELLED" } });
  }

  async leaveTypes() {
    return prisma.leaveType.findMany({ select: { id: true, name: true, daysAllowed: true }, orderBy: { name: "asc" } });
  }
}

export default new PeopleService();
