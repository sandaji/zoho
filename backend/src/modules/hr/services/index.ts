import { prisma } from "@core/database/db";
import { logger } from "@core/utils/logger";
import { notFoundError, validationError } from "@core/errors/errors";
import {
  CreateUserDTO,
  UpdateUserDTO,
  UserResponseDTO,
  CreatePayrollDTO,
  UpdatePayrollDTO,
  PayrollResponseDTO,
  PayrollListQueryDTO,
  PayrollCalculationDTO,
} from "../dtos";

export class HrService {
  private prisma = prisma;

  // HR DASHBOARD STATS
  async getHRStats(): Promise<any> {
    try {
      const [
        totalEmployees,
        activeJobPostings,
        pendingLeaveRequests,
        upcomingEvaluations,
      ] = await Promise.all([
        this.prisma.user.count({
          where: { isActive: true },
        }),
        this.prisma.jobPosting.count({ where: { status: "PUBLISHED" } }),
        this.prisma.leaveRequest.count({
          where: { status: "PENDING" },
        }),
        this.prisma.performanceEvaluation.count({
          where: { date: { gte: new Date() } },
        }),
      ]);

      return {
        totalEmployees,
        activeJobPostings,
        pendingLeaveRequests,
        upcomingEvaluations,
      };
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch HR stats");
      throw error;
    }
  }

  // USER OPERATIONS
  async createUser(dto: CreateUserDTO): Promise<UserResponseDTO> {
    try {
      logger.debug({ email: dto.email }, "Creating user");

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash: dto.password, // In production, hash this!
          name: dto.name,
          phone: dto.phone,
          role: dto.role as any,
          branchId: dto.branchId,
        },
      });

      logger.info({ id: user.id, email: user.email }, "User created");

      return this.formatUserResponse(user);
    } catch (error) {
      logger.error({ err: error }, "Failed to create user");
      throw error;
    }
  }

  async getUser(id: string): Promise<UserResponseDTO> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { id },
      });

      if (!user) {
        throw notFoundError("User", id);
      }

      return this.formatUserResponse(user);
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch user");
      throw error;
    }
  }

  async updateUser(id: string, dto: UpdateUserDTO): Promise<UserResponseDTO> {
    try {
      const user = await this.prisma.user.findFirst({ where: { id } });

      if (!user) {
        throw notFoundError("User", id);
      }

      const updated = await this.prisma.user.update({
        where: { id },
        data: {
          name: dto.name ?? user.name,
          phone: dto.phone ?? user.phone,
          role: dto.role as any,
          branchId: dto.branchId ?? user.branchId,
          isActive: dto.isActive ?? user.isActive,
        },
      });

      logger.info({ id, name: updated.name }, "User updated");

      return this.formatUserResponse(updated);
    } catch (error) {
      logger.error({ err: error }, "Failed to update user");
      throw error;
    }
  }

  // PAYROLL OPERATIONS
  async createPayroll(
    dto: CreatePayrollDTO,
    scope: { authorizedBranchIds?: string[]; onlyOwnedRecords?: boolean; userId?: string } = {},
  ): Promise<PayrollResponseDTO> {
    try {
      logger.debug({ userId: dto.userId }, "Creating payroll");

      const start = new Date(dto.period_start);
      const end = new Date(dto.period_end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || start > end) {
        throw validationError("A valid payroll period is required");
      }
      if (![dto.base_salary, dto.allowances ?? 0, dto.deductions ?? 0].every((value) => Number.isFinite(value) && value >= 0)) {
        throw validationError("Salary, allowances, and deductions must be non-negative amounts");
      }
      if ((dto.deductions ?? 0) > dto.base_salary + (dto.allowances ?? 0)) {
        throw validationError("Deductions cannot exceed base salary plus allowances");
      }

      const employee = await this.prisma.user.findFirst({
        where: {
          id: scope.onlyOwnedRecords && scope.userId ? scope.userId : dto.userId,
          isActive: true,
          ...(scope.authorizedBranchIds?.length ? { branchId: { in: scope.authorizedBranchIds } } : {}),
        },
      });
      if (!employee) {
        throw notFoundError("Active employee", dto.userId);
      }

      // One payroll record per employee and calendar month; the unique payroll
      // number makes repeated submissions fail safely instead of duplicating pay.
      const payrollNo = `PAY-${employee.id}-${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
      const existing = await this.prisma.payroll.findUnique({ where: { payroll_no: payrollNo } });
      if (existing) {
        throw validationError(`A payroll record already exists for ${employee.name} in this month`);
      }

      const calculation = this.calculateNetSalary({
        baseSalary: dto.base_salary,
        allowances: dto.allowances || 0,
        deductions: dto.deductions || 0,
      });

      const payroll = await this.prisma.payroll.create({
        data: {
          payroll_no: payrollNo,
          status: "draft",
          userId: employee.id,
          base_salary: dto.base_salary,
          allowances: dto.allowances || 0,
          deductions: dto.deductions || 0,
          net_salary: calculation.netSalary,
          period_start: start,
          period_end: end,
          notes: dto.notes,
        },
        include: { user: { select: { id: true, name: true, email: true, branchId: true, department: { select: { name: true } } } } },
      });

      logger.info(
        {
          id: payroll.id,
          payrollNo: payroll.payroll_no,
        },
        "Payroll created",
      );

      return this.formatPayrollResponse(payroll);
    } catch (error) {
      logger.error({ err: error }, "Failed to create payroll");
      throw error;
    }
  }

  async getPayroll(
    id: string,
    scope: { authorizedBranchIds?: string[]; onlyOwnedRecords?: boolean; userId?: string } = {},
  ): Promise<PayrollResponseDTO> {
    try {
      const payroll = await this.prisma.payroll.findFirst({
        where: {
          id,
          ...(scope.authorizedBranchIds?.length ? { user: { branchId: { in: scope.authorizedBranchIds } } } : {}),
          ...(scope.onlyOwnedRecords && scope.userId ? { userId: scope.userId } : {}),
        },
        include: { user: { select: { id: true, name: true, email: true, branchId: true, department: { select: { name: true } } } } },
      });

      if (!payroll) {
        throw notFoundError("Payroll", id);
      }

      return this.formatPayrollResponse(payroll);
    } catch (error) {
      logger.error({ err: error }, "Failed to fetch payroll");
      throw error;
    }
  }

  async listPayroll(
    query: PayrollListQueryDTO,
  ): Promise<{ data: PayrollResponseDTO[]; total: number }> {
    try {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query.status) {
        const statuses = ["draft", "submitted", "approved", "paid", "reversed"];
        if (!statuses.includes(query.status)) throw validationError("Invalid payroll status filter");
        where.status = query.status;
      }
      if (query.userId) where.userId = query.userId;
      if (query.authorizedBranchIds?.length) {
        where.user = { ...(where.user || {}), branchId: { in: query.authorizedBranchIds } };
      }
      if (query.onlyOwnedRecords && query.requestUserId) {
        where.userId = query.requestUserId;
      }

      if (query.startDate || query.endDate) {
        where.period_start = { ...(where.period_start || {}) };
        if (query.startDate) {
          const start = new Date(query.startDate);
          if (!Number.isFinite(start.getTime())) throw validationError("Invalid startDate");
          where.period_start.gte = start;
        }
        if (query.endDate) {
          const end = new Date(query.endDate);
          if (!Number.isFinite(end.getTime())) throw validationError("Invalid endDate");
          end.setUTCHours(23, 59, 59, 999);
          where.period_start.lte = end;
        }
      }

      const [data, total] = await Promise.all([
        this.prisma.payroll.findMany({
          where,
          skip,
          take: limit,
          orderBy: { period_start: "desc" },
          include: { user: { select: { id: true, name: true, email: true, branchId: true, department: { select: { name: true } } } } },
        }),
        this.prisma.payroll.count({ where }),
      ]);

      return {
        data: data.map((p: any) => this.formatPayrollResponse(p)),
        total,
      };
    } catch (error) {
      logger.error({ err: error }, "Failed to list payroll");
      throw error;
    }
  }

  async updatePayroll(
    id: string,
    dto: UpdatePayrollDTO,
    scope: { authorizedBranchIds?: string[]; onlyOwnedRecords?: boolean; userId?: string } = {},
  ): Promise<PayrollResponseDTO> {
    try {
      const payroll = await this.prisma.payroll.findFirst({
        where: {
          id,
          ...(scope.authorizedBranchIds?.length ? { user: { branchId: { in: scope.authorizedBranchIds } } } : {}),
          ...(scope.onlyOwnedRecords && scope.userId ? { userId: scope.userId } : {}),
        },
        include: { user: true },
      });

      if (!payroll) {
        throw notFoundError("Payroll", id);
      }

      const allowedStatuses = ["draft", "submitted", "approved", "paid", "reversed"];
      const nextStatus = (dto.status ?? payroll.status) as typeof payroll.status;
      if (!allowedStatuses.includes(nextStatus)) {
        throw validationError(`Invalid payroll status. Must be one of: ${allowedStatuses.join(", ")}`);
      }
      const transitions: Record<string, string[]> = {
        draft: ["draft", "submitted", "reversed"],
        submitted: ["submitted", "draft", "approved", "reversed"],
        approved: ["approved", "submitted", "paid", "reversed"],
        paid: ["paid"],
        reversed: ["reversed"],
      };
      if (!transitions[payroll.status]?.includes(nextStatus)) {
        throw validationError(`Cannot transition payroll from ${payroll.status} to ${nextStatus}`);
      }

      if (payroll.status !== "draft" && [dto.base_salary, dto.allowances, dto.deductions].some((value) => value !== undefined)) {
        throw validationError("Salary amounts can only be edited while payroll is a draft");
      }

      const base = dto.base_salary ?? payroll.base_salary;
      const allowances = dto.allowances ?? payroll.allowances;
      const deductions = dto.deductions ?? payroll.deductions;
      if (![base, allowances, deductions].every((value) => Number.isFinite(value) && value >= 0)) {
        throw validationError("Salary, allowances, and deductions must be non-negative amounts");
      }
      if (deductions > base + allowances) {
        throw validationError("Deductions cannot exceed base salary plus allowances");
      }

      const calculation = this.calculateNetSalary({
        baseSalary: base,
        allowances,
        deductions,
      });

      const paidDate = nextStatus === "paid" ? (dto.paid_date ? new Date(dto.paid_date) : new Date()) : undefined;
      if (paidDate && !Number.isFinite(paidDate.getTime())) throw validationError("Invalid paid date");
      const paymentMethods = ["bank_transfer", "cheque", "cash"];
      if (dto.payment_method && !paymentMethods.includes(dto.payment_method)) {
        throw validationError(`Payment method must be one of: ${paymentMethods.join(", ")}`);
      }

      const updated = await this.prisma.$transaction(async (tx: any) => {
        const record = await tx.payroll.update({
          where: { id },
          data: {
            status: nextStatus,
            base_salary: base,
            allowances,
            deductions,
            net_salary: calculation.netSalary,
            paid_date: paidDate,
            notes: dto.notes,
          },
          include: { user: { select: { id: true, name: true, email: true, branchId: true, department: { select: { name: true } } } } },
        });

        if (nextStatus === "paid" && payroll.status !== "paid") {
          const existingPayment = await tx.financeTransaction.findFirst({ where: { payrollId: id } });
          if (!existingPayment) {
            await tx.financeTransaction.create({
              data: {
                type: "expense",
                category: "payroll",
                reference_no: `PAYMENT-${payroll.payroll_no}`,
                description: `Payroll payment - ${payroll.user?.name || "Employee"}`,
                amount: calculation.netSalary,
                payrollId: id,
                branchId: payroll.user?.branchId ?? null,
                payment_method: dto.payment_method || "bank_transfer",
                transactionDate: paidDate || new Date(),
                reference_doc: payroll.payroll_no,
                notes: dto.notes || `Paid payroll ${payroll.payroll_no}`,
              },
            });
          }
        }
        return record;
      });

      logger.info({ id, status: updated.status }, "Payroll updated");

      return this.formatPayrollResponse(updated);
    } catch (error) {
      logger.error({ err: error }, "Failed to update payroll");
      throw error;
    }
  }

  private calculateNetSalary(
    dto: Omit<PayrollCalculationDTO, "netSalary">,
  ): PayrollCalculationDTO {
    const netSalary = dto.baseSalary + dto.allowances - dto.deductions;
    return {
      baseSalary: dto.baseSalary,
      allowances: dto.allowances,
      deductions: dto.deductions,
      netSalary: Math.max(0, netSalary),
    };
  }

  private formatUserResponse(user: any): UserResponseDTO {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      branchId: user.branchId,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private formatPayrollResponse(payroll: any): PayrollResponseDTO {
    return {
      id: payroll.id,
      payroll_no: payroll.payroll_no,
      status: payroll.status,
      userId: payroll.userId,
      base_salary: payroll.base_salary,
      allowances: payroll.allowances,
      deductions: payroll.deductions,
      net_salary: payroll.net_salary,
      period_start: payroll.period_start.toISOString(),
      period_end: payroll.period_end.toISOString(),
      paid_date: payroll.paid_date?.toISOString(),
      notes: payroll.notes,
      user: payroll.user ? {
        id: payroll.user.id,
        name: payroll.user.name,
        email: payroll.user.email,
        branchId: payroll.user.branchId,
        department: payroll.user.department ? { name: payroll.user.department.name } : null,
      } : undefined,
    };
  }
}
