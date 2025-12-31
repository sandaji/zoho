"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersController = void 0;
const zod_1 = require("zod");
const customers_service_1 = require("./customers.service");
// Validation schemas
const createCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Name is required"),
    email: zod_1.z.string().email().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    taxId: zod_1.z.string().optional().nullable(),
});
const updateCustomerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    email: zod_1.z.string().email().optional().nullable(),
    phone: zod_1.z.string().optional().nullable(),
    address: zod_1.z.string().optional().nullable(),
    taxId: zod_1.z.string().optional().nullable(),
});
class CustomersController {
    /**
     * Create a new customer
     */
    static async create(req, res, next) {
        try {
            const data = createCustomerSchema.parse(req.body);
            const customer = await customers_service_1.CustomersService.create(data);
            res.status(201).json({ success: true, data: customer });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * List all customers with optional search
     */
    static async findAll(req, res, next) {
        try {
            const { search, limit, offset } = req.query;
            const result = await customers_service_1.CustomersService.findAll({
                search: search,
                limit: limit ? parseInt(limit) : undefined,
                offset: offset ? parseInt(offset) : undefined,
            });
            res.status(200).json({ success: true, ...result });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Quick search for POS autocomplete
     */
    static async search(req, res, next) {
        try {
            const { q, limit } = req.query;
            const customers = await customers_service_1.CustomersService.search(q, limit ? parseInt(limit) : 10);
            res.status(200).json({ success: true, data: customers });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get customer by ID
     */
    static async findById(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, error: "Customer ID required" });
                return;
            }
            const customer = await customers_service_1.CustomersService.findById(id);
            if (!customer) {
                res.status(404).json({ success: false, error: "Customer not found" });
                return;
            }
            res.status(200).json({ success: true, data: customer });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update customer
     */
    static async update(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, error: "Customer ID required" });
                return;
            }
            const data = updateCustomerSchema.parse(req.body);
            const customer = await customers_service_1.CustomersService.update(id, data);
            res.status(200).json({ success: true, data: customer });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete customer
     */
    static async delete(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({ success: false, error: "Customer ID required" });
                return;
            }
            await customers_service_1.CustomersService.delete(id);
            res.status(200).json({ success: true, message: "Customer deleted" });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CustomersController = CustomersController;
