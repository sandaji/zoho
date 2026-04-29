/**
 * Branch Service
 * Handles business logic for branch management operations
 */

import { prisma } from "../../lib/db";
import { AppError, ErrorCode } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { CreateBranchDTO, UpdateBranchDTO, BranchListFilters } from "./branch.dto";

export class BranchService {
  /**
   * Get all branches with employee/warehouse counts
   */
  async getAllBranches(filters?: BranchListFilters) {
    const where: Record<string, unknown> = {};

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { city: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters?.authorizedBranchIds && filters.authorizedBranchIds.length > 0) {
      where.id = { in: filters.authorizedBranchIds };
    }

    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const [branches, total] = await Promise.all([
      prisma.branch.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              warehouses: true,
            },
          },
        },
      }),
      prisma.branch.count({ where }),
    ]);

    const data = branches.map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      city: b.city,
      address: b.address,
      phone: b.phone,
      isActive: b.isActive,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      employeeCount: b._count.users,
      warehouseCount: b._count.warehouses,
    }));

    return {
      branches: data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single branch with users and warehouses
   */
  async getBranch(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
        warehouses: {
          select: { id: true, name: true, location: true, capacity: true, isActive: true },
        },
        _count: {
          select: {
            users: true,
            warehouses: true,
          },
        },
      },
    });

    if (!branch) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
    }

    return branch;
  }

  /**
   * Create a new branch
   */
  async createBranch(dto: CreateBranchDTO) {
    // Validate required fields
    if (!dto.code || !dto.name || !dto.city) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Missing required fields: code, name, city"
      );
    }

    // Check if code already exists
    const existingBranch = await prisma.branch.findUnique({
      where: { code: dto.code },
    });

    if (existingBranch) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `Branch code '${dto.code}' already exists`
      );
    }

    const branch = await prisma.$transaction(async (tx) => {
      const newBranch = await tx.branch.create({
        data: {
          code: dto.code,
          name: dto.name,
          city: dto.city,
          address: dto.address,
          phone: dto.phone,
        },
      });

      // Optional: Assign manager
      if (dto.managerId) {
        await tx.user.update({
          where: { id: dto.managerId },
          data: { branchId: newBranch.id, role: "manager" },
        });
      }

      return newBranch;
    });

    logger.info({ branchId: branch.id, code: branch.code }, "Branch created");

    return branch;
  }

  /**
   * Update an existing branch
   */
  async updateBranch(id: string, dto: UpdateBranchDTO) {
    const branch = await prisma.branch.findUnique({ where: { id } });

    if (!branch) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
    }

    const updatedBranch = await prisma.$transaction(async (tx) => {
      const updated = await tx.branch.update({
        where: { id },
        data: {
          name: dto.name ?? branch.name,
          city: dto.city ?? branch.city,
          address: dto.address ?? branch.address,
          phone: dto.phone ?? branch.phone,
          isActive: dto.isActive ?? branch.isActive,
        },
      });

      // Optional: Update manager
      if (dto.managerId) {
        await tx.user.update({
          where: { id: dto.managerId },
          data: { branchId: id, role: "manager" },
        });
      }

      return updated;
    });

    logger.info({ branchId: id }, "Branch updated");

    return updatedBranch;
  }

  /**
   * Delete a branch (with dependency checks)
   */
  async deleteBranch(id: string) {
    const branch = await prisma.branch.findUnique({
      where: { id },
      include: {
        users: { select: { id: true } },
        warehouses: { select: { id: true } },
        salesDocuments: { select: { id: true } },
      },
    });

    if (!branch) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
    }

    // Check if branch has dependencies
    if (
      branch.users.length > 0 ||
      branch.warehouses.length > 0 ||
      branch.salesDocuments.length > 0
    ) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Cannot delete branch with associated employees, warehouses, or sales. Transfer or delete them first.",
        {
          employeeCount: branch.users.length,
          warehouseCount: branch.warehouses.length,
          salesCount: branch.salesDocuments.length,
        }
      );
    }

    await prisma.branch.delete({ where: { id } });

    logger.info({ branchId: id, code: branch.code }, "Branch deleted");
  }
}
