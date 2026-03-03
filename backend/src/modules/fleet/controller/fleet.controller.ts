/**
 * Fleet Module - Controller Layer
 * Handles HTTP requests for fleet management and deliveries
 * Endpoints:
 * - GET /trucks - List all trucks with filtering
 * - POST /deliveries - Create new delivery
 * - PATCH /deliveries/:id/status - Update delivery status
 */

import { Request, Response, NextFunction } from "express";
import { FleetService } from "../service/fleet.service";
import {
  GetTrucksQueryDTO,
  CreateDeliveryDTO,
  UpdateDeliveryStatusDTO,
} from "../dto";
import { validationError } from "../../../lib/errors";
import { logger } from "../../../lib/logger";

export class FleetController {
  private service = new FleetService();

  /**
   * GET /trucks - Retrieve all trucks with filtering, pagination, and search
   */
  async getTrucks(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: GetTrucksQueryDTO = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        isActive:
          req.query.isActive !== undefined
            ? req.query.isActive === "true"
            : undefined,
        search: req.query.search as string | undefined,
      };

      logger.debug({ query }, "GET /trucks");

      const result = await this.service.getTrucks(query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /deliveries - Create new delivery
   * Request body:
   * {
   *   salesId: string,
   *   driverId: string,
   *   truckId: string,
   *   destination: string,
   *   estimated_km?: number,
   *   scheduled_date?: ISO8601,
   *   notes?: string
   * }
   */
  async createDelivery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreateDeliveryDTO = req.body;

      // Validate required fields
      if (!dto.salesId || !dto.salesId.trim()) {
        throw validationError("salesId is required");
      }

      if (!dto.driverId || !dto.driverId.trim()) {
        throw validationError("driverId is required");
      }

      if (!dto.truckId || !dto.truckId.trim()) {
        throw validationError("truckId is required");
      }

      if (!dto.destination || !dto.destination.trim()) {
        throw validationError("destination is required");
      }

      // Validate estimated_km if provided
      if (dto.estimated_km !== undefined && dto.estimated_km <= 0) {
        throw validationError("estimated_km must be greater than 0");
      }

      logger.debug({
        salesId: dto.salesId,
        driverId: dto.driverId,
        truckId: dto.truckId,
      }, "POST /deliveries");

      const result = await this.service.createDelivery(dto);

      res.status(201).json({
        success: true,
        data: result,
        message: `Delivery ${result.delivery_no} created successfully`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /deliveries/:id/status - Update delivery status
   * Request body:
   * {
   *   status: "pending" | "assigned" | "in_transit" | "delivered" | "failed" | "rescheduled",
   *   actual_km?: number,
   *   picked_up_at?: ISO8601,
   *   delivered_at?: ISO8601,
   *   notes?: string
   * }
   */
  async updateDeliveryStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const dto: UpdateDeliveryStatusDTO = req.body;

      // Validate ID
      if (!id || !id.trim()) {
        throw validationError("Delivery ID is required");
      }

      // Validate status
      if (!dto.status || !dto.status.trim()) {
        throw validationError("status is required");
      }

      const validStatuses = [
        "pending",
        "assigned",
        "in_transit",
        "delivered",
        "failed",
        "rescheduled",
      ];

      if (!validStatuses.includes(dto.status)) {
        throw validationError(
          `Invalid status. Must be one of: ${validStatuses.join(", ")}`
        );
      }

      // Validate actual_km if provided
      if (dto.actual_km !== undefined && dto.actual_km < 0) {
        throw validationError("actual_km cannot be negative");
      }

      logger.debug({
        id,
        status: dto.status,
      }, "PATCH /deliveries/:id/status");

      const result = await this.service.updateDeliveryStatus(id, dto);

      res.json({
        success: true,
        data: result,
        message: `Delivery status updated to ${dto.status}`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /deliveries/:id/timeline - Get delivery progress timeline
   */
  async getDeliveryTimeline(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id || !id.trim()) {
        throw validationError("Delivery ID is required");
      }

      logger.debug({ id }, "GET /deliveries/:id/timeline");

      const result = await this.service.getDeliveryTimeline(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /deliveries - List deliveries with filtering
   */
  async listDeliveries(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit
          ? parseInt(req.query.limit as string)
          : undefined,
        status: req.query.status as string | undefined,
        driverId: req.query.driverId as string | undefined,
        truckId: req.query.truckId as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
      };

      logger.debug({ query }, "GET /deliveries");

      const result = await this.service.listDeliveries(query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // ======================================================================
  // LEGACY METHODS FOR BACKWARDS COMPATIBILITY
  // ======================================================================

  /**
   * POST /fleet/trucks - Create truck (legacy)
   */
  async createTruck(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { registration, model, capacity, license_plate } = req.body;

      if (!registration || !model || !capacity) {
        throw validationError(
          "Missing required fields: registration, model, capacity"
        );
      }

      logger.debug({ registration }, "POST /fleet/trucks");

      const truck = await this.service.createTruckLegacy({
        registration,
        model,
        capacity,
        license_plate,
      });

      res.status(201).json({
        success: true,
        data: truck,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /fleet/trucks/:id - Get single truck (legacy)
   */
  async getTruck(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id || !id.trim()) {
        throw validationError("Truck ID is required");
      }

      logger.debug({ id }, "GET /fleet/trucks/:id");

      const truck = await this.service.getTruckLegacy(id);

      res.json({
        success: true,
        data: truck,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /fleet/trucks/:id - Update truck (legacy)
   */
  async updateTruck(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { model, capacity, license_plate, isActive } = req.body;

      if (!id || !id.trim()) {
        throw validationError("Truck ID is required");
      }

      logger.debug({ id }, "PATCH /fleet/trucks/:id");

      const truck = await this.service.updateTruckLegacy(id, {
        model,
        capacity,
        license_plate,
        isActive,
      });

      res.json({
        success: true,
        data: truck,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /fleet/deliveries/:id - Get single delivery (legacy)
   */
  async getDelivery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id || !id.trim()) {
        throw validationError("Delivery ID is required");
      }

      logger.debug({ id }, "GET /fleet/deliveries/:id");

      const delivery = await this.service.getDeliveryLegacy(id);

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /fleet/deliveries/:id - Update delivery (legacy)
   */
  async updateDelivery(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const dto = req.body;

      if (!id || !id.trim()) {
        throw validationError("Delivery ID is required");
      }

      logger.debug({ id }, "PATCH /fleet/deliveries/:id");

      const delivery = await this.service.updateDeliveryLegacy(id, dto);

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      next(error);
    }
  }
}
