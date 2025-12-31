"use strict";
/**
 * Payroll Module - Service Layer
 * Handles payroll processing, calculations, and financial transactions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollService = void 0;
const db_1 = require("../../../lib/db");
const logger_1 = require("../../../lib/logger");
const errors_1 = require("../../../lib/errors");
class PayrollService {
    constructor() {
        this.prisma = db_1.prisma;
    }
    /**
     * Run payroll batch - process all employees for given period
     * Uses atomic transaction to ensure all-or-nothing processing
     */
    async runPayroll(dto) {
        try {
            logger_1.logger.info({
                period_start: dto.period_start,
                period_end: dto.period_end,
            }, "Starting payroll run");
            // Validate date range
            const startDate = new Date(dto.period_start);
            const endDate = new Date(dto.period_end);
            if (startDate >= endDate) {
                throw (0, errors_1.validationError)("period_start must be before period_end");
            }
            if (dto.month < 1 || dto.month > 12) {
                throw (0, errors_1.validationError)("month must be between 1 and 12");
            }
            // Get all active employees with payroll info
            const employees = await this.prisma.user.findMany({
                where: {
                    role: "EMPLOYEE",
                    isActive: true,
                },
            });
            if (employees.length === 0) {
                throw (0, errors_1.validationError)("No active employees found for payroll");
            }
            // Process payroll in atomic transaction
            const batchId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const details = [];
            let totalAmount = 0;
            const result = await this.prisma.$transaction(async (tx) => {
                for (const employee of employees) {
                    try {
                        // Get or create payroll record
                        const payrollNo = `PAY-${employee.id}-${dto.year}-${String(dto.month).padStart(2, "0")}`;
                        const existingPayroll = await tx.payroll.findUnique({
                            where: { payroll_no: payrollNo },
                        });
                        if (existingPayroll && existingPayroll.status === "paid") {
                            logger_1.logger.warn({
                                employeeId: employee.id,
                                payrollNo,
                            }, "Payroll already paid for employee");
                            details.push({
                                payroll_id: existingPayroll.id,
                                payroll_no: payrollNo,
                                user_id: employee.id,
                                user_name: employee.name || "Unknown",
                                base_salary: existingPayroll.base_salary,
                                allowances: existingPayroll.allowances,
                                deductions: existingPayroll.deductions,
                                net_salary: existingPayroll.net_salary,
                                status: "skipped",
                                paid_date: existingPayroll.paid_date?.toISOString(),
                            });
                            continue;
                        }
                        // Calculate payroll amounts
                        const baseSalary = employee.salary || 0;
                        const allowances = dto.include_allowances ? baseSalary * 0.15 : 0; // 15% allowances
                        const deductions = dto.include_deductions ? baseSalary * 0.1 : 0; // 10% deductions (PF, tax, etc)
                        const netSalary = baseSalary + allowances - deductions;
                        // Create or update payroll record
                        const payroll = existingPayroll
                            ? await tx.payroll.update({
                                where: { payroll_no: payrollNo },
                                data: {
                                    base_salary: baseSalary,
                                    allowances: allowances,
                                    deductions: deductions,
                                    net_salary: netSalary,
                                    period_start: startDate,
                                    period_end: endDate,
                                    status: "processed",
                                },
                            })
                            : await tx.payroll.create({
                                data: {
                                    payroll_no: payrollNo,
                                    userId: employee.id,
                                    base_salary: baseSalary,
                                    allowances: allowances,
                                    deductions: deductions,
                                    net_salary: netSalary,
                                    period_start: startDate,
                                    period_end: endDate,
                                    status: "processed",
                                },
                            });
                        // Create finance transaction for payroll
                        const transaction = await tx.financeTransaction.create({
                            data: {
                                type: "payroll",
                                reference_no: payrollNo,
                                description: `Payroll - ${employee.name} (${dto.month}/${dto.year})`,
                                amount: netSalary,
                                payrollId: payroll.id,
                                payment_method: "bank_transfer",
                                reference_doc: `Payroll Run ${batchId}`,
                                notes: dto.notes || `Payroll batch ${batchId}`,
                            },
                        });
                        totalAmount += netSalary;
                        details.push({
                            payroll_id: payroll.id,
                            payroll_no: payrollNo,
                            user_id: employee.id,
                            user_name: employee.name || "Unknown",
                            base_salary: baseSalary,
                            allowances: allowances,
                            deductions: deductions,
                            net_salary: netSalary,
                            status: "processed",
                            transaction_id: transaction.id,
                        });
                        logger_1.logger.debug({
                            employeeId: employee.id,
                            netSalary,
                        }, "Payroll processed");
                    }
                    catch (error) {
                        logger_1.logger.error(error, "Error processing payroll for employee");
                        throw error;
                    }
                }
                return {
                    batchId,
                    details,
                    totalAmount,
                    processedCount: details.length,
                };
            });
            logger_1.logger.info({
                batchId: result.batchId,
                employeeCount: result.processedCount,
                totalAmount: result.totalAmount,
            }, "Payroll run completed");
            return {
                success: true,
                batch_id: result.batchId,
                payroll_count: result.processedCount,
                total_amount: result.totalAmount,
                period_start: dto.period_start,
                period_end: dto.period_end,
                status: "completed",
                created_at: new Date().toISOString(),
                details: result.details,
            };
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to run payroll");
            throw error;
        }
    }
    /**
     * Get comprehensive payroll report for a period
     */
    async getPayrollReport(period_start, period_end) {
        try {
            logger_1.logger.debug({
                period_start,
                period_end,
            }, "Generating payroll report");
            const startDate = new Date(period_start);
            const endDate = new Date(period_end);
            const payrolls = await this.prisma.payroll.findMany({
                where: {
                    period_start: {
                        gte: startDate,
                    },
                    period_end: {
                        lte: endDate,
                    },
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
            const totalCost = payrolls.reduce((sum, p) => sum + p.net_salary, 0);
            const totalAllowances = payrolls.reduce((sum, p) => sum + p.allowances, 0);
            const totalDeductions = payrolls.reduce((sum, p) => sum + p.deductions, 0);
            const salaries = payrolls
                .map((p) => p.net_salary)
                .sort((a, b) => a - b);
            const averageSalary = totalCost / payrolls.length;
            const highestSalary = Math.max(...salaries);
            const lowestSalary = Math.min(...salaries);
            // Status breakdown
            const statusBreakdown = this.getStatusBreakdown(payrolls);
            const paidCount = payrolls.filter((p) => p.status === "paid").length;
            const pendingCount = payrolls.filter((p) => p.status === "processed" || p.status === "draft").length;
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
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to generate payroll report");
            throw error;
        }
    }
    /**
     * Get payroll analytics with trends and breakdowns
     */
    async getPayrollAnalytics(period_start, period_end) {
        try {
            logger_1.logger.debug({
                period_start,
                period_end,
            }, "Generating payroll analytics");
            const startDate = new Date(period_start);
            const endDate = new Date(period_end);
            const payrolls = await this.prisma.payroll.findMany({
                where: {
                    period_start: {
                        gte: startDate,
                    },
                    period_end: {
                        lte: endDate,
                    },
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
            const totalCost = payrolls.reduce((sum, p) => sum + p.net_salary, 0);
            const averageSalary = totalCost / payrolls.length;
            const salaries = payrolls
                .map((p) => p.net_salary)
                .sort((a, b) => a - b);
            const medianSalary = salaries.length % 2 === 0
                ? (salaries[salaries.length / 2 - 1] +
                    salaries[salaries.length / 2]) /
                    2
                : salaries[Math.floor(salaries.length / 2)];
            // Department breakdown
            const departmentMap = new Map();
            payrolls.forEach((p) => {
                const dept = p.user?.department || "Unassigned";
                if (!departmentMap.has(dept)) {
                    departmentMap.set(dept, []);
                }
                departmentMap.get(dept).push(p);
            });
            const departmentBreakdown = Array.from(departmentMap.entries()).map(([dept, deptPayrolls]) => ({
                department: dept,
                employee_count: deptPayrolls.length,
                total_cost: deptPayrolls.reduce((sum, p) => sum + p.net_salary, 0),
                average_salary: deptPayrolls.reduce((sum, p) => sum + p.net_salary, 0) /
                    deptPayrolls.length,
            }));
            // Monthly trend (last 12 months from end date)
            const monthlyTrend = [];
            for (let i = 11; i >= 0; i--) {
                const monthDate = new Date(endDate);
                monthDate.setMonth(monthDate.getMonth() - i);
                const monthPayrolls = payrolls.filter((p) => {
                    const pStart = new Date(p.period_start);
                    return (pStart.getMonth() === monthDate.getMonth() &&
                        pStart.getFullYear() === monthDate.getFullYear());
                });
                if (monthPayrolls.length > 0) {
                    const monthCost = monthPayrolls.reduce((sum, p) => sum + p.net_salary, 0);
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
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to generate payroll analytics");
            throw error;
        }
    }
    /**
     * Get payroll by ID
     */
    async getPayroll(id) {
        try {
            const payroll = await this.prisma.payroll.findUnique({
                where: { id },
                include: {
                    user: true,
                    transactions: true,
                },
            });
            if (!payroll) {
                throw (0, errors_1.notFoundError)("Payroll", id);
            }
            return payroll;
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to fetch payroll");
            throw error;
        }
    }
    /**
     * Update payroll status (draft → processed → paid)
     */
    async updatePayrollStatus(id, status, paid_date) {
        try {
            const validStatuses = ["draft", "processed", "paid", "failed"];
            if (!validStatuses.includes(status)) {
                throw (0, errors_1.validationError)(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
            }
            const payroll = await this.prisma.payroll.findUnique({
                where: { id },
            });
            if (!payroll) {
                throw (0, errors_1.notFoundError)("Payroll", id);
            }
            // Validate transition rules
            const validTransitions = {
                draft: ["processed", "failed"],
                processed: ["paid", "failed"],
                paid: ["paid"], // Terminal state
                failed: ["processed", "draft"],
            };
            if (!validTransitions[payroll.status]?.includes(status)) {
                throw (0, errors_1.validationError)(`Cannot transition from ${payroll.status} to ${status}`);
            }
            const updateData = {
                status,
            };
            if (status === "paid" && paid_date) {
                updateData.paid_date = new Date(paid_date);
            }
            const updated = await this.prisma.payroll.update({
                where: { id },
                data: updateData,
                include: {
                    user: true,
                },
            });
            logger_1.logger.info({
                id,
                oldStatus: payroll.status,
                newStatus: status,
            }, "Payroll status updated");
            return updated;
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to update payroll status");
            throw error;
        }
    }
    /**
     * Helper: Get status breakdown with percentages
     */
    getStatusBreakdown(payrolls) {
        const total = payrolls.length;
        const statuses = {};
        payrolls.forEach((p) => {
            if (!statuses[p.status]) {
                statuses[p.status] = [];
            }
            statuses[p.status].push(p);
        });
        return Object.entries(statuses).map(([status, records]) => ({
            status,
            count: records.length,
            total_amount: records.reduce((sum, p) => sum + p.net_salary, 0),
            percentage: (records.length / total) * 100,
        }));
    }
}
exports.PayrollService = PayrollService;
