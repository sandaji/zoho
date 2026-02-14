/**
 * Fleet Service - Enhanced with getTrucks, createDelivery, updateDeliveryStatus
 * Handles truck fleet management and delivery operations with atomic transactions
 */

import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { notFoundError } from "../../../lib/errors";
import {
  GetTrucksQueryDTO,
  GetTrucksResponseDTO,
  TrucksListResponseDTO,
  CreateDeliveryDTO,
  UpdateDeliveryStatusDTO,
  DeliveryDetailResponseDTO,
  DeliveriesListResponseDTO,
  DeliveryTimelineDTO,
} from "../dto";

export class FleetService {
  private prisma = prisma;

  /**
   * GET TRUCKS - Retrieve all trucks with advanced filtering
   * Includes delivery count and utilization rate
   */
  async getTrucks(query: GetTrucksQueryDTO): Promise<TrucksListResponseDTO> {
    try {
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 10));
      const skip = (page - 1) * limit;

      // Build where clause
      const where: any = {};

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      if (query.search) {
        where.OR = [
          { registration: { contains: query.search, mode: "insensitive" } },
          { model: { contains: query.search, mode: "insensitive" } },
          { license_plate: { contains: query.search, mode: "insensitive" } },
        ];
      }

      // Fetch trucks with delivery info
      const [trucks, total] = await Promise.all([
        this.prisma.truck.findMany({
          where,
          skip,
          take: limit,
          include: {
            deliveries: {
              where: {
                status: {
                  in: ["pending", "assigned", "in_transit"],
                },
              },
              select: {
                id: true,
                truck: { select: { registration: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.truck.count({ where }),
      ]);

      const data = trucks.map((truck: any) => this.formatTruckResponse(truck));

      const totalPages = Math.ceil(total / limit);

      logger.info({ page, limit, total }, "Trucks fetched");

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error(error as Error, "Failed to fetch trucks");
      throw error;
    }
  }

  /**
   * CREATE DELIVERY - Create new delivery with validation
   * Atomic transaction ensuring all data is valid before commit
   */
  async createDelivery(
    dto: CreateDeliveryDTO
  ): Promise<DeliveryDetailResponseDTO> {
    try {
      // Validate input
      if (!dto.salesId || !dto.driverId || !dto.truckId) {
        throw new Error("Missing required fields: salesId, driverId, truckId");
      }

      if (!dto.destination || dto.destination.trim().length === 0) {
        throw new Error("Destination is required");
      }

      // Atomic transaction
      const delivery = await this.prisma.$transaction(async (tx: any) => {
        // Verify sales exists and is confirmed
        const sales = await tx.sales.findUnique({
          where: { id: dto.salesId },
          select: { id: true, status: true, total_amount: true },
        });

        if (!sales) {
          throw new Error(`Sales order ${dto.salesId} not found`);
        }

        if (sales.status !== "confirmed" && sales.status !== "shipped") {
          throw new Error(
            `Sales order must be confirmed before delivery (current: ${sales.status})`
          );
        }

        // Verify driver exists
        const driver = await tx.user.findUnique({
          where: { id: dto.driverId },
          select: { id: true, role: true },
        });

        if (!driver) {
          throw new Error(`Driver ${dto.driverId} not found`);
        }

        if (driver.role !== "driver") {
          throw new Error("Selected user is not a driver");
        }

        // Verify truck exists and is active
        const truck = await tx.truck.findUnique({
          where: { id: dto.truckId },
          select: { id: true, isActive: true },
        });

        if (!truck) {
          throw new Error(`Truck ${dto.truckId} not found`);
        }

        if (!truck.isActive) {
          throw new Error("Selected truck is not active");
        }

        // Check if sales already has a delivery
        const existingDelivery = await tx.delivery.findUnique({
          where: { salesId: dto.salesId },
        });

        if (existingDelivery) {
          throw new Error("Sales order already has an associated delivery");
        }

        // Create delivery with unique number
        const deliveryNo = `DEL-${Date.now()}-${Math.random()
          .toString(36)
          .substring(7)}`;

        const newDelivery = await tx.delivery.create({
          data: {
            delivery_no: deliveryNo,
            status: "pending",
            salesId: dto.salesId,
            driverId: dto.driverId,
            truckId: dto.truckId,
            destination: dto.destination,
            estimated_km: dto.estimated_km,
            scheduled_date: dto.scheduled_date
              ? new Date(dto.scheduled_date)
              : null,
            notes: dto.notes,
          },
          include: {
            sales: {
              select: { id: true, invoice_no: true, total_amount: true },
            },
            driver: { select: { id: true, name: true, phone: true } },
            truck: {
              include: {
                deliveries: {
                  where: {
                    status: { in: ["pending", "assigned", "in_transit"] },
                  },
                  select: { id: true },
                },
              },
            },
          },
        });

        // Update sales status to shipped
        await tx.sales.update({
          where: { id: dto.salesId },
          data: { status: "shipped" },
        });

        return newDelivery;
      });

      logger.info({
        id: delivery.id,
        delivery_no: delivery.delivery_no,
        sales_id: delivery.salesId,
      }, "Delivery created");

      return this.formatDeliveryDetailResponse(delivery as any);
    } catch (error) {
      logger.error(error as Error, "Failed to create delivery");
      throw error;
    }
  }

  /**
   * UPDATE DELIVERY STATUS - Update delivery status with timestamp tracking
   * Atomic transaction ensuring status transitions are valid
   */
  async updateDeliveryStatus(
    id: string,
    dto: UpdateDeliveryStatusDTO
  ): Promise<DeliveryDetailResponseDTO> {
    try {
      // Validate status transition
      const validStatuses = [
        "pending",
        "assigned",
        "in_transit",
        "delivered",
        "failed",
        "rescheduled",
      ];

      if (!validStatuses.includes(dto.status)) {
        throw new Error(`Invalid status: ${dto.status}`);
      }

      // Atomic transaction
      const delivery = await this.prisma.$transaction(async (tx: any) => {
        const current = await tx.delivery.findUnique({
          where: { id },
          select: { id: true, status: true },
        });

        if (!current) {
          throw new Error(`Delivery ${id} not found`);
        }

        // Validate status transition
        const validTransitions: Record<string, string[]> = {
          pending: ["assigned", "failed"],
          assigned: ["in_transit", "failed", "rescheduled"],
          in_transit: ["delivered", "failed"],
          delivered: [],
          failed: ["assigned", "rescheduled"],
          rescheduled: ["assigned", "failed"],
        };

        const allowedNext = validTransitions[current.status] || [];
        if (!allowedNext.includes(dto.status)) {
          throw new Error(
            `Cannot transition from ${current.status} to ${dto.status}`
          );
        }

        // Set timestamps based on status
        const timestamps: any = {};

        if (dto.status === "in_transit" && !current.picked_up_at) {
          timestamps.picked_up_at = dto.picked_up_at
            ? new Date(dto.picked_up_at)
            : new Date();
        }

        if (
          dto.status === "delivered" &&
          (dto.delivered_at || !current.delivered_at)
        ) {
          timestamps.delivered_at = dto.delivered_at
            ? new Date(dto.delivered_at)
            : new Date();
        }

        // Update delivery
        const updated = await tx.delivery.update({
          where: { id },
          data: {
            status: dto.status as any,
            actual_km: dto.actual_km,
            notes: dto.notes ?? undefined,
            ...timestamps,
          },
          include: {
            sales: {
              select: { id: true, invoice_no: true, total_amount: true },
            },
            driver: { select: { id: true, name: true, phone: true } },
            truck: {
              include: {
                deliveries: {
                  where: {
                    status: { in: ["pending", "assigned", "in_transit"] },
                  },
                  select: { id: true },
                },
              },
            },
          },
        });

        // If delivered, update sales status
        if (dto.status === "delivered") {
          await tx.sales.update({
            where: { id: updated.salesId },
            data: { status: "delivered" },
          });
        }

        return updated;
      });

      logger.info({ id, status: dto.status }, "Delivery status updated");

      return this.formatDeliveryDetailResponse(delivery as any);
    } catch (error) {
      logger.error(error as Error, "Failed to update delivery status");
      throw error;
    }
  }

  /**
   * GET DELIVERY TIMELINE - Retrieve delivery progress timeline
   */
  async getDeliveryTimeline(id: string): Promise<DeliveryTimelineDTO> {
    try {
      const delivery = await this.prisma.delivery.findUnique({
        where: { id },
        select: {
          id: true,
          delivery_no: true,
          status: true,
          createdAt: true,
          picked_up_at: true,
          delivered_at: true,
        },
      });

      if (!delivery) {
        throw notFoundError("Delivery", id);
      }

      // Build timeline events
      const events: any[] = [
        {
          id: "created",
          status: "pending",
          timestamp: delivery.createdAt.toISOString(),
          notes: "Delivery created",
        },
      ];

      if (delivery.picked_up_at) {
        events.push({
          id: "picked_up",
          status: "in_transit",
          timestamp: delivery.picked_up_at.toISOString(),
          notes: "Order picked up",
        });
      }

      if (delivery.delivered_at) {
        events.push({
          id: "delivered",
          status: "delivered",
          timestamp: delivery.delivered_at.toISOString(),
          notes: "Order delivered",
        });
      }

      return {
        deliveryId: delivery.id,
        delivery_no: delivery.delivery_no,
        status: delivery.status,
        events,
      };
    } catch (error) {
      logger.error(error as Error, "Failed to fetch delivery timeline");
      throw error;
    }
  }

  /**
   * LIST DELIVERIES - Get paginated list of deliveries with filtering
   */
  async listDeliveries(query: any): Promise<DeliveriesListResponseDTO> {
    try {
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 10));
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query.status) where.status = query.status;
      if (query.driverId) where.driverId = query.driverId;
      if (query.truckId) where.truckId = query.truckId;

      if (query.startDate || query.endDate) {
        where.scheduled_date = {};
        if (query.startDate) {
          where.scheduled_date.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.scheduled_date.lte = new Date(query.endDate);
        }
      }

      const [deliveries, total] = await Promise.all([
        this.prisma.delivery.findMany({
          where,
          skip,
          take: limit,
          include: {
            sales: {
              select: { id: true, invoice_no: true, total_amount: true },
            },
            driver: { select: { id: true, name: true, phone: true } },
            truck: {
              include: {
                deliveries: {
                  where: {
                    status: { in: ["pending", "assigned", "in_transit"] },
                  },
                  select: { id: true },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.delivery.count({ where }),
      ]);

      const data = deliveries.map((d: any) =>
        this.formatDeliveryDetailResponse(d)
      );

      const totalPages = Math.ceil(total / limit);

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      };
    } catch (error) {
      logger.error(error as Error, "Failed to list deliveries");
      throw error;
    }
  }

  // PRIVATE FORMATTING METHODS

  private formatTruckResponse(truck: any): GetTrucksResponseDTO {
    const activeDeliveries = truck.deliveries?.length || 0;

    return {
      id: truck.id,
      registration: truck.registration,
      model: truck.model,
      capacity: truck.capacity,
      license_plate: truck.license_plate,
      isActive: truck.isActive,
      createdAt: truck.createdAt.toISOString(),
      updatedAt: truck.updatedAt.toISOString(),
      deliveryCount: activeDeliveries,
      utilizationRate:
        truck.capacity > 0 ? (activeDeliveries / truck.capacity) * 100 : 0,
    };
  }

  private formatDeliveryDetailResponse(
    delivery: any
  ): DeliveryDetailResponseDTO {
    return {
      id: delivery.id,
      delivery_no: delivery.delivery_no,
      status: delivery.status,
      sales: delivery.sales
        ? {
          id: delivery.sales.id,
          invoice_no: delivery.sales.invoice_no,
          total_amount: delivery.sales.total_amount,
        }
        : undefined,
      driver: delivery.driver
        ? {
          id: delivery.driver.id,
          name: delivery.driver.name,
          phone: delivery.driver.phone,
        }
        : undefined,
      truck: this.formatTruckResponse(delivery.truck),
      destination: delivery.destination,
      estimated_km: delivery.estimated_km,
      actual_km: delivery.actual_km,
      scheduled_date: delivery.scheduled_date?.toISOString(),
      picked_up_at: delivery.picked_up_at?.toISOString(),
      delivered_at: delivery.delivered_at?.toISOString(),
      notes: delivery.notes,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    };
  }

  // LEGACY METHODS FOR BACKWARDS COMPATIBILITY

  /**
   * Legacy createTruck method
   */
  async createTruckLegacy(data: any) {
    const truck = await this.prisma.truck.create({
      data: {
        registration: data.registration,
        model: data.model,
        capacity: data.capacity,
        license_plate: data.license_plate,
      },
    });

    logger.info({ id: truck.id }, "Truck created (legacy)");
    return {
      id: truck.id,
      registration: truck.registration,
      model: truck.model,
      capacity: truck.capacity,
      license_plate: truck.license_plate,
      isActive: truck.isActive,
      createdAt: truck.createdAt.toISOString(),
      updatedAt: truck.updatedAt.toISOString(),
    };
  }

  /**
   * Legacy getTruck method
   */
  async getTruckLegacy(id: string) {
    const truck = await this.prisma.truck.findUnique({
      where: { id },
    });

    if (!truck) {
      throw notFoundError("Truck", id);
    }

    return {
      id: truck.id,
      registration: truck.registration,
      model: truck.model,
      capacity: truck.capacity,
      license_plate: truck.license_plate,
      isActive: truck.isActive,
      createdAt: truck.createdAt.toISOString(),
      updatedAt: truck.updatedAt.toISOString(),
    };
  }

  /**
   * Legacy updateTruck method
   */
  async updateTruckLegacy(id: string, data: any) {
    const truck = await this.prisma.truck.findUnique({ where: { id } });

    if (!truck) {
      throw notFoundError("Truck", id);
    }

    const updated = await this.prisma.truck.update({
      where: { id },
      data: {
        model: data.model ?? truck.model,
        capacity: data.capacity ?? truck.capacity,
        license_plate: data.license_plate ?? truck.license_plate,
        isActive: data.isActive ?? truck.isActive,
      },
    });

    logger.info({ id }, "Truck updated (legacy)");

    return {
      id: updated.id,
      registration: updated.registration,
      model: updated.model,
      capacity: updated.capacity,
      license_plate: updated.license_plate,
      isActive: updated.isActive,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Legacy getDelivery method
   */
  async getDeliveryLegacy(id: string) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: {

        driver: true,
        truck: true,
      },
    });

    if (!delivery) {
      throw notFoundError("Delivery", id);
    }

    return {
      id: delivery.id,
      delivery_no: delivery.delivery_no,
      status: delivery.status,
      driverId: delivery.driverId,

      truckId: delivery.truckId,
      destination: delivery.destination,
      estimated_km: delivery.estimated_km,
      actual_km: delivery.actual_km,
      scheduled_date: delivery.scheduled_date?.toISOString(),
      picked_up_at: delivery.picked_up_at?.toISOString(),
      delivered_at: delivery.delivered_at?.toISOString(),
      notes: delivery.notes,
      createdAt: delivery.createdAt.toISOString(),
      updatedAt: delivery.updatedAt.toISOString(),
    };
  }

  /**
   * Legacy updateDelivery method
   */
  async updateDeliveryLegacy(id: string, data: any) {
    const delivery = await this.prisma.delivery.findUnique({ where: { id } });

    if (!delivery) {
      throw notFoundError("Delivery", id);
    }

    const updated = await this.prisma.delivery.update({
      where: { id },
      data: {
        status: data.status as any,
        destination: data.destination ?? delivery.destination,
        actual_km: data.actual_km,
        picked_up_at: data.picked_up_at
          ? new Date(data.picked_up_at)
          : undefined,
        delivered_at: data.delivered_at
          ? new Date(data.delivered_at)
          : undefined,
        notes: data.notes ?? delivery.notes,
      },
    });

    logger.info({ id, status: updated.status }, "Delivery updated (legacy)");

    return {
      id: updated.id,
      delivery_no: updated.delivery_no,
      status: updated.status,
      driverId: updated.driverId,

      truckId: updated.truckId,
      destination: updated.destination,
      estimated_km: updated.estimated_km,
      actual_km: updated.actual_km,
      scheduled_date: updated.scheduled_date?.toISOString(),
      picked_up_at: updated.picked_up_at?.toISOString(),
      delivered_at: updated.delivered_at?.toISOString(),
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
