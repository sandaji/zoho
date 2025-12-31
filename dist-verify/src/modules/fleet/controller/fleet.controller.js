"use strict";
/**
 * Fleet Module - Controller Layer
 * Handles HTTP requests for fleet management and deliveries
 * Endpoints:
 * - GET /trucks - List all trucks with filtering
 * - POST /deliveries - Create new delivery
 * - PATCH /deliveries/:id/status - Update delivery status
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FleetController = void 0;
const fleet_service_1 = require("../service/fleet.service");
const errors_1 = require("../../../lib/errors");
const logger_1 = require("../../../lib/logger");
class FleetController {
    constructor() {
        this.service = new fleet_service_1.FleetService();
    }
    /**
     * GET /trucks - Retrieve all trucks with filtering, pagination, and search
     */
    async getTrucks(req, res, next) {
        try {
            const query = {
                page: req.query.page ? parseInt(req.query.page) : undefined,
                limit: req.query.limit
                    ? parseInt(req.query.limit)
                    : undefined,
                isActive: req.query.isActive !== undefined
                    ? req.query.isActive === "true"
                    : undefined,
                search: req.query.search,
            };
            logger_1.logger.debug({ query }, "GET /trucks");
            const result = await this.service.getTrucks(query);
            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        }
        catch (error) {
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
    async createDelivery(req, res, next) {
        try {
            const dto = req.body;
            // Validate required fields
            if (!dto.salesId || !dto.salesId.trim()) {
                throw (0, errors_1.validationError)("salesId is required");
            }
            if (!dto.driverId || !dto.driverId.trim()) {
                throw (0, errors_1.validationError)("driverId is required");
            }
            if (!dto.truckId || !dto.truckId.trim()) {
                throw (0, errors_1.validationError)("truckId is required");
            }
            if (!dto.destination || !dto.destination.trim()) {
                throw (0, errors_1.validationError)("destination is required");
            }
            // Validate estimated_km if provided
            if (dto.estimated_km !== undefined && dto.estimated_km <= 0) {
                throw (0, errors_1.validationError)("estimated_km must be greater than 0");
            }
            logger_1.logger.debug({
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
        }
        catch (error) {
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
    async updateDeliveryStatus(req, res, next) {
        try {
            const { id } = req.params;
            const dto = req.body;
            // Validate ID
            if (!id || !id.trim()) {
                throw (0, errors_1.validationError)("Delivery ID is required");
            }
            // Validate status
            if (!dto.status || !dto.status.trim()) {
                throw (0, errors_1.validationError)("status is required");
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
                throw (0, errors_1.validationError)(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
            }
            // Validate actual_km if provided
            if (dto.actual_km !== undefined && dto.actual_km < 0) {
                throw (0, errors_1.validationError)("actual_km cannot be negative");
            }
            logger_1.logger.debug({
                id,
                status: dto.status,
            }, "PATCH /deliveries/:id/status");
            const result = await this.service.updateDeliveryStatus(id, dto);
            res.json({
                success: true,
                data: result,
                message: `Delivery status updated to ${dto.status}`,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /deliveries/:id/timeline - Get delivery progress timeline
     */
    async getDeliveryTimeline(req, res, next) {
        try {
            const { id } = req.params;
            if (!id || !id.trim()) {
                throw (0, errors_1.validationError)("Delivery ID is required");
            }
            logger_1.logger.debug({ id }, "GET /deliveries/:id/timeline");
            const result = await this.service.getDeliveryTimeline(id);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /deliveries - List deliveries with filtering
     */
    async listDeliveries(req, res, next) {
        try {
            const query = {
                page: req.query.page ? parseInt(req.query.page) : undefined,
                limit: req.query.limit
                    ? parseInt(req.query.limit)
                    : undefined,
                status: req.query.status,
                driverId: req.query.driverId,
                truckId: req.query.truckId,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
            };
            logger_1.logger.debug({ query }, "GET /deliveries");
            const result = await this.service.listDeliveries(query);
            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ======================================================================
    // LEGACY METHODS FOR BACKWARDS COMPATIBILITY
    // ======================================================================
    /**
     * POST /fleet/trucks - Create truck (legacy)
     */
    async createTruck(req, res, next) {
        try {
            const { registration, model, capacity, license_plate } = req.body;
            if (!registration || !model || !capacity) {
                throw (0, errors_1.validationError)("Missing required fields: registration, model, capacity");
            }
            logger_1.logger.debug({ registration }, "POST /fleet/trucks");
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /fleet/trucks/:id - Get single truck (legacy)
     */
    async getTruck(req, res, next) {
        try {
            const { id } = req.params;
            if (!id || !id.trim()) {
                throw (0, errors_1.validationError)("Truck ID is required");
            }
            logger_1.logger.debug({ id }, "GET /fleet/trucks/:id");
            const truck = await this.service.getTruckLegacy(id);
            res.json({
                success: true,
                data: truck,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /fleet/trucks/:id - Update truck (legacy)
     */
    async updateTruck(req, res, next) {
        try {
            const { id } = req.params;
            const { model, capacity, license_plate, isActive } = req.body;
            if (!id || !id.trim()) {
                throw (0, errors_1.validationError)("Truck ID is required");
            }
            logger_1.logger.debug({ id }, "PATCH /fleet/trucks/:id");
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /fleet/deliveries/:id - Get single delivery (legacy)
     */
    async getDelivery(req, res, next) {
        try {
            const { id } = req.params;
            if (!id || !id.trim()) {
                throw (0, errors_1.validationError)("Delivery ID is required");
            }
            logger_1.logger.debug({ id }, "GET /fleet/deliveries/:id");
            const delivery = await this.service.getDeliveryLegacy(id);
            res.json({
                success: true,
                data: delivery,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * PATCH /fleet/deliveries/:id - Update delivery (legacy)
     */
    async updateDelivery(req, res, next) {
        try {
            const { id } = req.params;
            const dto = req.body;
            if (!id || !id.trim()) {
                throw (0, errors_1.validationError)("Delivery ID is required");
            }
            logger_1.logger.debug({ id }, "PATCH /fleet/deliveries/:id");
            const delivery = await this.service.updateDeliveryLegacy(id, dto);
            res.json({
                success: true,
                data: delivery,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.FleetController = FleetController;
