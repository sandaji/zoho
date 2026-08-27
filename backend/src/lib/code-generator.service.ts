// backend/src/lib/code-generator.service.ts
/**
 * Generates unique, human-readable codes for Customers and Employees.
 *
 * Customer codes: 2 letters (admin-chosen, changeable) + 6-digit
 * auto-incrementing number, e.g. "AB000001". There is a single active
 * prefix at a time; changing it does not reset the counter.
 *
 * Employee codes: 2 letters (HR-chosen per department) + auto-incrementing
 * number, e.g. "JS001", "SS001", "SA001". Each department has its own
 * independent counter.
 */

import { prisma } from "./db";
import { Prisma } from "../generated";
import { AppError, ErrorCode } from "./errors";

const CUSTOMER_CODE_DIGITS = 6;
const EMPLOYEE_CODE_DIGITS = 3;
const DEFAULT_CUSTOMER_PREFIX = "CU";

const TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10000,
  timeout: 15000,
} as const;

function validatePrefix(prefix: string): string {
  const clean = (prefix || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(clean)) {
    throw new AppError(
      ErrorCode.INVALID_INPUT,
      400,
      `Prefix must be exactly 2 letters (e.g. "AB") — got "${prefix}"`,
    );
  }
  return clean;
}

export class CodeGeneratorService {
  // ── Customer codes ────────────────────────────────────────────────────

  /** Get the single active customer code setting, creating a default one if none exists. */
  static async getCustomerCodeSetting() {
    const existing = await prisma.customerCodeSetting.findFirst();
    if (existing) return existing;
    return prisma.customerCodeSetting.create({
      data: { prefix: DEFAULT_CUSTOMER_PREFIX, nextNumber: 1 },
    });
  }

  /**
   * Admin sets/changes the 2-letter customer code prefix.
   * The counter is left untouched — future codes just start using the
   * new prefix from wherever the counter currently is.
   */
  static async setCustomerCodePrefix(prefix: string) {
    const clean = validatePrefix(prefix);
    const setting = await CodeGeneratorService.getCustomerCodeSetting();
    return prisma.customerCodeSetting.update({
      where: { id: setting.id },
      data: { prefix: clean },
    });
  }

  /** Atomically claim the next customer code, e.g. "AB000001". */
  static async generateCustomerCode(): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const setting = await tx.customerCodeSetting.findFirst();

      let prefix: string;
      let assignedNumber: number;

      if (setting) {
        prefix = setting.prefix;
        assignedNumber = setting.nextNumber;
        await tx.customerCodeSetting.update({
          where: { id: setting.id },
          data: { nextNumber: { increment: 1 } },
        });
      } else {
        prefix = DEFAULT_CUSTOMER_PREFIX;
        assignedNumber = 1;
        await tx.customerCodeSetting.create({
          data: { prefix, nextNumber: 2 },
        });
      }

      return `${prefix}${String(assignedNumber).padStart(CUSTOMER_CODE_DIGITS, "0")}`;
    }, TX_OPTIONS);
  }

  // ── Employee codes / Departments ─────────────────────────────────────

  static async listDepartments() {
    return prisma.department.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { users: true } } },
    });
  }

  static async getDepartment(id: string) {
    const department = await prisma.department.findUnique({ where: { id } });
    if (!department) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Department not found");
    }
    return department;
  }

  /** HR creates a department with its own 2-letter prefix (e.g. "Junior Staff" → "JS"). */
  static async createDepartment(name: string, prefix: string) {
    const cleanName = (name || "").trim();
    if (!cleanName) {
      throw new AppError(ErrorCode.INVALID_INPUT, 400, "Department name is required");
    }
    const cleanPrefix = validatePrefix(prefix);

    const existingPrefix = await prisma.department.findUnique({ where: { prefix: cleanPrefix } });
    if (existingPrefix) {
      throw new AppError(
        ErrorCode.ALREADY_EXISTS,
        409,
        `Prefix "${cleanPrefix}" is already used by department "${existingPrefix.name}"`,
      );
    }

    return prisma.department.create({
      data: { name: cleanName, prefix: cleanPrefix },
    });
  }

  /**
   * HR updates a department's name, prefix, or active status.
   * Changing the prefix does not reset that department's counter.
   */
  static async updateDepartment(
    id: string,
    updates: { name?: string; prefix?: string; isActive?: boolean },
  ) {
    await CodeGeneratorService.getDepartment(id);

    const data: Prisma.DepartmentUpdateInput = {};
    if (updates.name !== undefined) {
      const cleanName = updates.name.trim();
      if (!cleanName) {
        throw new AppError(ErrorCode.INVALID_INPUT, 400, "Department name cannot be empty");
      }
      data.name = cleanName;
    }
    if (updates.isActive !== undefined) {
      data.isActive = updates.isActive;
    }
    if (updates.prefix !== undefined) {
      const cleanPrefix = validatePrefix(updates.prefix);
      const existingPrefix = await prisma.department.findFirst({
        where: { prefix: cleanPrefix, id: { not: id } },
      });
      if (existingPrefix) {
        throw new AppError(
          ErrorCode.ALREADY_EXISTS,
          409,
          `Prefix "${cleanPrefix}" is already used by department "${existingPrefix.name}"`,
        );
      }
      data.prefix = cleanPrefix;
    }

    return prisma.department.update({ where: { id }, data });
  }

  /** Atomically claim the next employee code for a department, e.g. "JS001". */
  static async generateEmployeeCode(departmentId: string): Promise<string> {
    return prisma.$transaction(async (tx) => {
      const department = await tx.department.findUnique({ where: { id: departmentId } });
      if (!department) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Department not found");
      }
      if (!department.isActive) {
        throw new AppError(
          ErrorCode.OPERATION_NOT_ALLOWED,
          422,
          `Department "${department.name}" is inactive`,
        );
      }

      const assignedNumber = department.nextNumber;
      await tx.department.update({
        where: { id: departmentId },
        data: { nextNumber: { increment: 1 } },
      });

      return `${department.prefix}${String(assignedNumber).padStart(EMPLOYEE_CODE_DIGITS, "0")}`;
    }, TX_OPTIONS);
  }
}
