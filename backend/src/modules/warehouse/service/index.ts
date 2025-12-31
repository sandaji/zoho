/**
 * Warehouse Module - Service Layer
 */

import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { notFoundError } from "../../../lib/errors";
import {
  CreateWarehouseDTO,
  UpdateWarehouseDTO,
  WarehouseResponseDTO,
  WarehouseListQueryDTO,
  WarehouseStockDTO,
} from "../dto";

export class WarehouseService {
  private prisma = prisma;

  async createWarehouse(
    dto: CreateWarehouseDTO
  ): Promise<WarehouseResponseDTO> {
    try {
      logger.debug({
        code: dto.code,
        branchId: dto.branchId,
      },"Creating warehouse", );

      const warehouse = await this.prisma.warehouse.create({
        data: {
          code: dto.code,
          name: dto.name,
          location: dto.location,
          capacity: dto.capacity,
          branchId: dto.branchId,
        },
      });

      logger.info({
        id: warehouse.id,
        code: warehouse.code,
      },"Warehouse created", );

      return this.formatResponse(warehouse);
    } catch (error) {
      logger.error(error as Error,"Failed to create warehouse", );
      throw error;
    }
  }

  async getWarehouse(id: string): Promise<WarehouseResponseDTO> {
    try {
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id },
      });

      if (!warehouse) {
        throw notFoundError("Warehouse", id);
      }

      return this.formatResponse(warehouse);
    } catch (error) {
      logger.error(error as Error,"Failed to fetch warehouse",);
      throw error;
    }
  }

  async listWarehouses(
    query: WarehouseListQueryDTO
  ): Promise<{ data: WarehouseResponseDTO[]; total: number }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query.branchId) where.branchId = query.branchId;
      if (typeof query.isActive === "boolean") where.isActive = query.isActive;
      if (query.search) {
        where.OR = [
          { code: { contains: query.search } },
          { name: { contains: query.search } },
        ];
      }

      const [data, total] = await Promise.all([
        this.prisma.warehouse.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.warehouse.count({ where }),
      ]);

      return {
        data: data.map((w) => this.formatResponse(w)),
        total,
      };
    } catch (error) {
      logger.error(error as Error,"Failed to list warehouses",);
      throw error;
    }
  }

  async updateWarehouse(
    id: string,
    dto: UpdateWarehouseDTO
  ): Promise<WarehouseResponseDTO> {
    try {
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id },
      });

      if (!warehouse) {
        throw notFoundError("Warehouse", id);
      }

      const updated = await this.prisma.warehouse.update({
        where: { id },
        data: {
          name: dto.name ?? warehouse.name,
          location: dto.location ?? warehouse.location,
          capacity: dto.capacity ?? warehouse.capacity,
          isActive: dto.isActive ?? warehouse.isActive,
        },
      });

      logger.info({ id, name: updated.name },"Warehouse updated", );

      return this.formatResponse(updated);
    } catch (error) {
      logger.error(error as Error,"Failed to update warehouse", );
      throw error;
    }
  }

  async getWarehouseStock(warehouseId: string): Promise<WarehouseStockDTO> {
    try {
      const warehouse = await this.prisma.warehouse.findUnique({
        where: { id: warehouseId },
      });

      if (!warehouse) {
        throw notFoundError("Warehouse", warehouseId);
      }

      const inventory = await this.prisma.inventory.findMany({
        where: { warehouseId },
        include: { product: true },
      });

      const usedCapacity = inventory.reduce(
        (sum, inv) => sum + inv.quantity,
        0
      );
      const availableCapacity = warehouse.capacity - usedCapacity;

      return {
        warehouseId,
        totalCapacity: warehouse.capacity,
        usedCapacity,
        availableCapacity,
        products: inventory.map((inv) => ({
          productId: inv.productId,
          productName: inv.product?.name || "Unknown",
          quantity: inv.quantity,
        })),
      };
    } catch (error) {
      logger.error(error as Error,"Failed to get warehouse stock", );
      throw error;
    }
  }

  private formatResponse(warehouse: any): WarehouseResponseDTO {
    return {
      id: warehouse.id,
      code: warehouse.code,
      name: warehouse.name,
      location: warehouse.location,
      capacity: warehouse.capacity,
      branchId: warehouse.branchId,
      isActive: warehouse.isActive,
      createdAt: warehouse.createdAt.toISOString(),
      updatedAt: warehouse.updatedAt.toISOString(),
    };
  }
}
