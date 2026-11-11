// backend/src/modules/customers/customers.controller.ts
import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { CustomersService } from "./customers.service";
import { CustomerLedgerService } from "./customer-ledger.service";

// Validation schemas
const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  customerType: z.string().optional().default("RETAIL"),
  creditLimit: z.number().optional().default(0),
  currentBalance: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
  // Defaults to the person creating the customer when not given
  salesmanId: z.string().min(1).optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  taxId: z.string().optional().nullable(),
  customerType: z.string().optional(),
  creditLimit: z.number().optional(),
  currentBalance: z.number().optional(),
  isActive: z.boolean().optional(),
  salesmanId: z.string().min(1).optional(),
});

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

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
      
      // Validate name uniqueness
      const existing = await CustomersService.findByName(data.name);
      if (existing) {
        res.status(409).json({ success: false, error: "Customer name already exists" });
        return;
      }

      const salesmanId = data.salesmanId ?? req.user?.userId;
      if (!salesmanId) {
        res.status(400).json({ success: false, error: "A salesman is required" });
        return;
      }
      const customer = await CustomersService.create({ ...data, salesmanId });
      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all active customers with optional search
   */
  static async findAll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { search, limit, offset, salesmanId } = req.query;

      const result = await CustomersService.findAll({
        salesmanId: (salesmanId as string) || undefined,
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
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

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
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

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

  /** Salesmen who can be assigned to customers */
  static async salesmen(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.status(200).json({ success: true, data: await CustomerLedgerService.salesmen() });
    } catch (error) {
      next(error);
    }
  }

  /** Bulk-assign a salesman to customers */
  static async assignSalesman(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = z
        .object({ customerIds: z.array(z.string()).min(1).max(1000), salesmanId: z.string().min(1) })
        .parse(req.body);
      res.status(200).json({ success: true, data: await CustomersService.assignSalesman(body.customerIds, body.salesmanId) });
    } catch (error) {
      next(error);
    }
  }

  /** Full statement: date, invoice no, debit, credit, running balance */
  static async statement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const from = dateOnly.parse(req.query.from || undefined);
      const to = dateOnly.parse(req.query.to || undefined);
      res.status(200).json({ success: true, data: await CustomerLedgerService.statement(id, { from, to }) });
    } catch (error) {
      next(error);
    }
  }

  /** Same statement as a CSV download */
  static async statementCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id as string;
      const from = dateOnly.parse(req.query.from || undefined);
      const to = dateOnly.parse(req.query.to || undefined);
      const out = await CustomerLedgerService.csv(id, { from, to });
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${out.filename}"`);
      res.status(200).send("﻿" + out.body);
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
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

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
