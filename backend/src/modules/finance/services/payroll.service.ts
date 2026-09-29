/**
 * Payroll Module - Service Layer
 * Handles payroll processing, calculations, and financial transactions
 */

import { prisma } from "@core/database/db";
import { logger } from "@core/utils/logger";
import { notFoundError, validationError } from "@core/errors/errors";
import {
  PayrollRunDTO,
  PayrollRunResponseDTO,
  PayrollDetailResponseDTO,
  PayrollReportDTO,
  PayrollStatusBreakdown,
  PayrollAnalyticsDTO,
  DepartmentPayrollBreakdown,
  MonthlyPayrollTrend,
} from "../dtos";

export class PayrollService {
  private prisma = prisma;

  /**
   * Submit draft payroll records for a period for review.
   */
  async runPayroll(
    dto: PayrollRunDTO,
    scope: { authorizedBranchIds?: string[]; onlyOwnedRecords?: boolean; userId?: string } = {},
  ): Promise<PayrollRunResponseDTO> {
    try {
      logger.info(
        {
          period_start: dto.period_start,
          period_end: dto.period_end,
        },
        "Starting payroll run",
      );

      // Validate date range
      const startDate = new Date(dto.period_start);
      const endDate = new Date(dto.period_end);

      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) {
        throw validationError("A valid payroll period is required");
      }

      if (!Number.isInteger(dto.month) || dto.month < 1 || dto.month > 12 || !Number.isInteger(dto.year)) {
        throw validationError("A valid payroll month and year are required");
      }
      if (startDate.getUTCFullYear() !== dto.year || startDate.getUTCMonth() + 1 !== dto.month) {
        throw validationError("The selected month and year must match the payroll period start date");
      }

      const batchId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const details: PayrollDetailResponseDTO[] = [];
      let totalAmount = 0;
      const payrollWhere: any = {
        period_start: { lte: endDate },
        period_end: { gte: startDate },
        status: "draft",
        ...(scope.authorizedBranchIds?.length ? { user: { branchId: { in: scope.authorizedBranchIds } } } : {}),
        ...(scope.onlyOwnedRecords && scope.userId ? { userId: scope.userId } : {}),
      };
      const payrolls = await this.prisma.payroll.findMany({
        where: payrollWhere,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { payroll_no: "asc" },
      });

      if (payrolls.length === 0) {
        throw validationError("Create draft payroll records for this period before submitting the payroll run");
      }

      // A payroll run submits existing draft records for review. It never
      // invents salary values or creates finance transactions; payout posting
      // happens exactly once when an approved record is marked paid.
      await this.prisma.$transaction(async (tx: any) => {
        for (const payroll of payrolls) {
          const updated = await tx.payroll.updateMany({
            where: { id: payroll.id, status: "draft" },
            data: { status: "submitted" },
          });
          if (!updated.count) continue;
          totalAmount += payroll.net_salary;
          details.push({
            payroll_id: payroll.id,
            payroll_no: payroll.payroll_no,
            user_id: payroll.userId,
            user_name: payroll.user?.name || "Unknown",
            base_salary: payroll.base_salary,
            allowances: payroll.allowances,
            deductions: payroll.deductions,
            net_salary: payroll.net_salary,
            status: "submitted",
            paid_date: payroll.paid_date?.toISOString(),
          });
        }
      });

      logger.info(
        {
          batchId,
          employeeCount: details.length,
          totalAmount,
        },
        "Payroll run submitted for review",
      );

      return {
        success: true,
        batch_id: batchId,
        payroll_count: details.length,
        total_amount: totalAmount,
        period_start: dto.period_start,
        period_end: dto.period_end,
        status: "submitted",
        created_at: new Date().toISOString(),
        details,
      };
    } catch (error) {
      logger.error(error as Error, "Failed to run payroll");
      throw error;
    }
  }

  /**
   * Get comprehensive payroll report for a period
   */
  async getPayrollReport(
    period_start: string,
    period_end: string,
    scope: { authorizedBranchIds?: string[]; onlyOwnedRecords?: boolean; userId?: string } = {},
  ): Promise<PayrollReportDTO> {
    try {
      logger.debug(
        {
          period_start,
          period_end,
        },
        "Generating payroll report",
      );

      const startDate = new Date(period_start);
      const endDate = new Date(period_end);
      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) {
        throw validationError("A valid report period is required");
      }

      const payrolls = await this.prisma.payroll.findMany({
        where: {
          period_start: {
            gte: startDate,
          },
          period_end: {
            lte: endDate,
          },
          ...(scope.authorizedBranchIds?.length ? { user: { branchId: { in: scope.authorizedBranchIds } } } : {}),
          ...(scope.onlyOwnedRecords && scope.userId ? { userId: scope.userId } : {}),
        },
        include: {
          user: true,
        },
      });

      if (payrolls.length === 0) {
        return {
          period_start,
          period_end,
          total_payroll_cost: 0,
          payroll_count: 0,
          average_salary: 0,
          highest_salary: 0,
          lowest_salary: 0,
          total_allowances: 0,
          total_deductions: 0,
          paid_payrolls: 0,
          pending_payrolls: 0,
          by_status: [],
        };
      }

      // Calculate metrics
      const totalCost = payrolls.reduce(
        (sum: number, p: any) => sum + p.net_salary,
        0,
      );
      const totalAllowances = payrolls.reduce(
        (sum: number, p: any) => sum + p.allowances,
        0,
      );
      const totalDeductions = payrolls.reduce(
        (sum: number, p: any) => sum + p.deductions,
        0,
      );
      const salaries = payrolls
        .map((p: any) => p.net_salary)
        .sort((a: number, b: number) => a - b);
      const averageSalary = totalCost / payrolls.length;
      const highestSalary = Math.max(...salaries);
      const lowestSalary = Math.min(...salaries);

      // Status breakdown
      const statusBreakdown = this.getStatusBreakdown(payrolls);

      const paidCount = payrolls.filter((p: any) => p.status === "paid").length;
      const pendingCount = payrolls.filter(
        (p: any) => p.status === "draft" || p.status === "submitted" || p.status === "approved",
      ).length;

      return {
        period_start,
        period_end,
        total_payroll_cost: totalCost,
        payroll_count: payrolls.length,
        average_salary: averageSalary,
        highest_salary: highestSalary,
        lowest_salary: lowestSalary,
        total_allowances: totalAllowances,
        total_deductions: totalDeductions,
        paid_payrolls: paidCount,
        pending_payrolls: pendingCount,
        by_status: statusBreakdown,
      };
    } catch (error) {
      logger.error(error as Error, "Failed to generate payroll report");
      throw error;
    }
  }

  /**
   * Get payroll analytics with trends and breakdowns
   */
  async getPayrollAnalytics(
    period_start: string,
    period_end: string,
    scope: { authorizedBranchIds?: string[]; onlyOwnedRecords?: boolean; userId?: string } = {},
  ): Promise<PayrollAnalyticsDTO> {
    try {
      logger.debug(
        {
          period_start,
          period_end,
        },
        "Generating payroll analytics",
      );

      const startDate = new Date(period_start);
      const endDate = new Date(period_end);
      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) {
        throw validationError("A valid report period is required");
      }

      const payrolls = await this.prisma.payroll.findMany({
        where: {
          period_start: {
            gte: startDate,
          },
          period_end: {
            lte: endDate,
          },
          ...(scope.authorizedBranchIds?.length ? { user: { branchId: { in: scope.authorizedBranchIds } } } : {}),
          ...(scope.onlyOwnedRecords && scope.userId ? { userId: scope.userId } : {}),
        },
        include: {
          user: true,
        },
      });

      if (payrolls.length === 0) {
        return {
          period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
          total_employees: 0,
          total_cost: 0,
          average_salary: 0,
          salary_range: {
            min: 0,
            max: 0,
            median: 0,
          },
          department_breakdown: [],
        };
      }

      // Calculate metrics
      const totalCost = payrolls.reduce(
        (sum: number, p: any) => sum + p.net_salary,
        0,
      );
      const averageSalary = totalCost / payrolls.length;
      const salaries = payrolls
        .map((p: any) => p.net_salary)
        .sort((a: number, b: number) => a - b);
      const medianSalary =
        salaries.length % 2 === 0
          ? (salaries[salaries.length / 2 - 1] +
              salaries[salaries.length / 2]) /
            2
          : salaries[Math.floor(salaries.length / 2)];

      // Department breakdown
      const departmentMap = new Map<string, any[]>();
      payrolls.forEach((p: any) => {
        const dept = p.user?.department || "Unassigned";
        if (!departmentMap.has(dept)) {
          departmentMap.set(dept, []);
        }
        departmentMap.get(dept)!.push(p);
      });

      const departmentBreakdown: DepartmentPayrollBreakdown[] = Array.from(
        departmentMap.entries(),
      ).map(([dept, deptPayrolls]) => ({
        department: dept,
        employee_count: deptPayrolls.length,
        total_cost: deptPayrolls.reduce(
          (sum: number, p: any) => sum + p.net_salary,
          0,
        ),
        average_salary:
          deptPayrolls.reduce((sum: number, p: any) => sum + p.net_salary, 0) /
          deptPayrolls.length,
      }));

      // Monthly trend (last 12 months from end date)
      const monthlyTrend: MonthlyPayrollTrend[] = [];
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(endDate);
        monthDate.setMonth(monthDate.getMonth() - i);

        const monthPayrolls = payrolls.filter((p: any) => {
          const pStart = new Date(p.period_start);
          return (
            pStart.getMonth() === monthDate.getMonth() &&
            pStart.getFullYear() === monthDate.getFullYear()
          );
        });

        if (monthPayrolls.length > 0) {
          const monthCost = monthPayrolls.reduce(
            (sum: number, p: any) => sum + p.net_salary,
            0,
          );
          monthlyTrend.push({
            month: monthDate.toISOString().split("T")[0] ?? "",
            total_cost: monthCost,
            employee_count: monthPayrolls.length,
            average_salary: monthCost / monthPayrolls.length,
          });
        }
      }

      return {
        period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
        total_employees: payrolls.length,
        total_cost: totalCost,
        average_salary: averageSalary,
        salary_range: {
          min: salaries[0],
          max: salaries[salaries.length - 1],
          median: medianSalary,
        },
        department_breakdown: departmentBreakdown,
        monthly_trend: monthlyTrend,
      };
    } catch (error) {
      logger.error(error as Error, "Failed to generate payroll analytics");
      throw error;
    }
  }

  /**
   * Get payroll by ID
   */
  async getPayroll(
    id: string,
    scope: { authorizedBranchIds?: string[]; onlyOwnedRecords?: boolean; userId?: string } = {},
  ): Promise<any> {
    try {
      const payroll = await this.prisma.payroll.findFirst({
        where: {
          id,
          ...(scope.authorizedBranchIds?.length ? { user: { branchId: { in: scope.authorizedBranchIds } } } : {}),
          ...(scope.onlyOwnedRecords && scope.userId ? { userId: scope.userId } : {}),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              branchId: true,
              department: { select: { name: true } },
            },
          },
          transactions: true,
        },
      });

      if (!payroll) {
        throw notFoundError("Payroll", id);
      }

      return payroll;
    } catch (error) {
      logger.error(error as Error, "Failed to fetch payroll");
      throw error;
    }
  }

  /**
   * Helper: Get status breakdown with percentages
   */
  private getStatusBreakdown(payrolls: any[]): PayrollStatusBreakdown[] {
    const total = payrolls.length;
    const statuses: Record<string, any[]> = {};

    payrolls.forEach((p: any) => {
      if (!statuses[p.status]) {
        statuses[p.status] = [];
      }
      statuses[p.status]!.push(p);
    });

    return Object.entries(statuses).map(([status, records]) => ({
      status,
      count: records.length,
      total_amount: records.reduce(
        (sum: number, p: any) => sum + p.net_salary,
        0,
      ),
      percentage: total ? (records.length / total) * 100 : 0,
    }));
  }
}
