// backend/src/modules/customers/customers.controller.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CustomersService } from "./customers.service";

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
});

export class CustomersController {
  /**
   * Create a new customer
   */
  static async create(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const data = createCustomerSchema.parse(req.body);
      const customer = await CustomersService.create(data);
      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all customers with optional search
   */
  static async findAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { search, limit, offset } = req.query;

      const result = await CustomersService.findAll({
        search: search as string,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Quick search for POS autocomplete
   */
  static async search(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { q, limit } = req.query;

      const customers = await CustomersService.search(
        q as string,
        limit ? parseInt(limit as string) : 10
      );

      res.status(200).json({ success: true, data: customers });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get customer by ID
   */
  static async findById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ success: false, error: "Customer ID required" });
        return;
      }

      const customer = await CustomersService.findById(id);

      if (!customer) {
        res.status(404).json({ success: false, error: "Customer not found" });
        return;
      }

      res.status(200).json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update customer
   */
  static async update(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ success: false, error: "Customer ID required" });
        return;
      }

      const data = updateCustomerSchema.parse(req.body);
      const customer = await CustomersService.update(id, data);

      res.status(200).json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete customer
   */
  static async delete(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ success: false, error: "Customer ID required" });
        return;
      }

      await CustomersService.delete(id);

      res.status(200).json({ success: true, message: "Customer deleted" });
    } catch (error) {
      next(error);
    }
  }
}
